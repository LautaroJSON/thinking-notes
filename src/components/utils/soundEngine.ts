import { SOUND_CATEGORY, type SoundCategoryId, type SoundId } from "./sounds";

// Motor de sonidos: los sonidos se sintetizan en el momento con la Web Audio
// API, sin archivos de audio. Cada receta arma unos pocos nodos que se
// descartan solos al terminar. Nada de acá lanza errores: si el navegador no
// puede reproducir, la app sigue igual y simplemente no suena.

// Volumen general: bajo a propósito, los sonidos acompañan, no protagonizan
const MASTER_GAIN = 0.18;
// Volumen relativo de cada categoría. La escritura queda como está; selección
// y acciones van más bajas para que acompañen sin sobresalir.
const CATEGORY_GAIN: Record<SoundCategoryId, number> = {
  typing: 1,
  selection: 0.5,
  actions: 0.65,
};
// Como máximo un sonido de escritura cada tanto (tecla mantenida, tipeo rápido)
const TYPING_MIN_INTERVAL_MS = 35;
const MAX_VOICES = 6;
// Margen para programar cada sonido un poquito en el futuro. Si la app está
// ocupada (por ejemplo, renderizando la nota que se acaba de abrir), el pedido
// llega tarde al hilo de audio y, sin este margen, el comienzo del sonido se
// corta y suena distinto. 15 ms no se perciben como demora.
const SCHEDULE_AHEAD_S = 0.015;
const TYPING_SOUNDS: ReadonlySet<SoundId> = new Set(["key", "delete", "enter"]);
// Pasar el mouse rápido por la lista no debe sonar como una ráfaga
const HOVER_MIN_INTERVAL_MS = 90;

let ctx: AudioContext | null = null;
let categoryOut: Record<SoundCategoryId, GainNode> | null = null;
let noiseBuffer: AudioBuffer | null = null;
// Momento (en el reloj de audio) en que termina cada voz que está sonando
let voiceEnds: number[] = [];
let lastTypingAt = -Infinity;
let lastHoverAt = -Infinity;

// Variación aleatoria de ±amount, para que las teclas no suenen idénticas
const jitter = (value: number, amount: number) =>
  value * (1 + (Math.random() * 2 - 1) * amount);

const envelope = (
  audio: AudioContext,
  t: number,
  peak: number,
  dur: number,
  attack = 0.003,
) => {
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return gain;
};

interface ToneOptions {
  type?: OscillatorType;
  freq: number;
  freqEnd?: number;
  dur: number;
  gain: number;
  attack?: number;
}

const tone = (
  audio: AudioContext,
  out: AudioNode,
  t: number,
  { type = "sine", freq, freqEnd, dur, gain, attack }: ToneOptions,
) => {
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const env = envelope(audio, t, gain, dur, attack);
  osc.connect(env);
  env.connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  return t + dur;
};

interface NoiseOptions {
  freq: number;
  freqEnd?: number;
  q: number;
  dur: number;
  gain: number;
  attack?: number;
}

// Ruido filtrado: el "roce" de lápiz o papel
const noise = (
  audio: AudioContext,
  out: AudioNode,
  t: number,
  { freq, freqEnd, q, dur, gain, attack }: NoiseOptions,
) => {
  const source = audio.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, t);
  if (freqEnd) filter.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  filter.Q.setValueAtTime(q, t);
  const env = envelope(audio, t, gain, dur, attack);
  source.connect(filter);
  filter.connect(env);
  env.connect(out);
  // Arranca en un punto al azar del buffer para que cada roce sea distinto
  source.start(t, Math.random() * 0.5);
  source.stop(t + dur + 0.02);
  return t + dur;
};

// Campanita amortiguada: fundamental más un armónico muy suave
const chime = (
  audio: AudioContext,
  out: AudioNode,
  t: number,
  freq: number,
  dur: number,
  gain: number,
) => {
  tone(audio, out, t, { freq: freq * 2, dur: dur * 0.6, gain: gain * 0.15 });
  return tone(audio, out, t, { freq, dur, gain, attack: 0.005 });
};

type Recipe = (audio: AudioContext, out: AudioNode, t: number) => number;

const RECIPES: Record<SoundId, Recipe> = {
  // Escritura: lápiz sobre papel, casi imperceptible
  key: (a, o, t) =>
    noise(a, o, t, {
      freq: jitter(3200, 0.15),
      q: 1.4,
      dur: jitter(0.024, 0.2),
      gain: jitter(0.32, 0.2),
      attack: 0.002,
    }),
  delete: (a, o, t) =>
    noise(a, o, t, {
      freq: jitter(1700, 0.1),
      q: 1.4,
      dur: 0.026,
      gain: jitter(0.3, 0.15),
      attack: 0.002,
    }),
  enter: (a, o, t) => {
    noise(a, o, t, { freq: 2600, q: 1.2, dur: 0.024, gain: 0.28, attack: 0.002 });
    return tone(a, o, t, {
      type: "triangle",
      freq: 230,
      freqEnd: 170,
      dur: 0.05,
      gain: 0.22,
    });
  },

  // Selección: toque de madera
  select: (a, o, t) =>
    tone(a, o, t, {
      freq: 740,
      freqEnd: 560,
      dur: 0.07,
      gain: 0.45,
      attack: 0.008,
    }),
  close: (a, o, t) =>
    tone(a, o, t, {
      freq: 560,
      freqEnd: 420,
      dur: 0.06,
      gain: 0.4,
      attack: 0.008,
    }),

  // Pasar el mouse sobre una nota: el roce más leve de un dedo sobre papel
  hover: (a, o, t) =>
    noise(a, o, t, {
      freq: jitter(2400, 0.08),
      q: 1.1,
      dur: 0.03,
      gain: 0.05,
      attack: 0.006,
    }),

  // Abrir una nota: una hoja que se levanta, roce que sube con un crujido
  // fino de papel
  noteOpen: (a, o, t) => {
    noise(a, o, t + 0.035, {
      freq: jitter(3000, 0.08),
      q: 1.6,
      dur: 0.05,
      gain: 0.04,
      attack: 0.008,
    });
    return noise(a, o, t, {
      freq: 900,
      freqEnd: 2200,
      q: 0.7,
      dur: 0.14,
      gain: 0.18,
      attack: 0.03,
    });
  },
  // Cerrar la nota: la hoja que se vuelve a apoyar, roce que baja y un
  // "flop" grave y apagado al final
  noteClose: (a, o, t) => {
    noise(a, o, t, {
      freq: 2100,
      freqEnd: 800,
      q: 0.7,
      dur: 0.12,
      gain: 0.17,
      attack: 0.025,
    });
    return noise(a, o, t + 0.075, {
      freq: 480,
      q: 0.6,
      dur: 0.06,
      gain: 0.16,
      attack: 0.004,
    });
  },

  // Panel lateral: un "deslizar" de papel corto, con un toque de madera
  // que sube al expandir y baja al colapsar
  panelOpen: (a, o, t) => {
    noise(a, o, t, {
      freq: 500,
      freqEnd: 1800,
      q: 0.8,
      dur: 0.16,
      gain: 0.16,
      attack: 0.04,
    });
    return tone(a, o, t + 0.05, {
      freq: 440,
      freqEnd: 560,
      attack: 0.015,
      dur: 0.1,
      gain: 0.2,
    });
  },
  panelClose: (a, o, t) => {
    noise(a, o, t, {
      freq: 1800,
      freqEnd: 500,
      q: 0.8,
      dur: 0.16,
      gain: 0.16,
      attack: 0.04,
    });
    return tone(a, o, t + 0.05, {
      freq: 560,
      freqEnd: 440,
      attack: 0.015,
      dur: 0.1,
      gain: 0.2,
    });
  },

  // Acciones
  create: (a, o, t) => {
    chime(a, o, t, 659.25, 0.15, 0.32);
    return chime(a, o, t + 0.07, 880, 0.15, 0.28);
  },
  // Enviar una idea: una hoja que se apoya sobre la mesa. Sin notas musicales,
  // para que no suene a notificación
  send: (a, o, t) => {
    noise(a, o, t, {
      freq: 1400,
      freqEnd: 650,
      q: 0.9,
      dur: 0.08,
      gain: 0.2,
      attack: 0.008,
    });
    return tone(a, o, t + 0.02, {
      freq: 320,
      freqEnd: 250,
      dur: 0.07,
      gain: 0.28,
    });
  },
  remove: (a, o, t) => {
    noise(a, o, t, { freq: 700, freqEnd: 400, q: 0.8, dur: 0.12, gain: 0.14 });
    chime(a, o, t, 587.33, 0.15, 0.28);
    return chime(a, o, t + 0.07, 440, 0.16, 0.26);
  },
  copy: (a, o, t) => {
    tone(a, o, t, {
      type: "triangle",
      freq: 1320,
      freqEnd: 1100,
      dur: 0.04,
      gain: 0.25,
    });
    return tone(a, o, t + 0.06, {
      type: "triangle",
      freq: 1480,
      freqEnd: 1240,
      dur: 0.04,
      gain: 0.22,
    });
  },
  drop: (a, o, t) => {
    noise(a, o, t, { freq: 900, q: 1, dur: 0.02, gain: 0.18, attack: 0.002 });
    return tone(a, o, t, { freq: 300, freqEnd: 210, dur: 0.09, gain: 0.55 });
  },
  paste: (a, o, t) =>
    noise(a, o, t, {
      freq: 800,
      freqEnd: 3000,
      q: 0.9,
      dur: 0.15,
      gain: 0.22,
      attack: 0.03,
    }),
  dictationStart: (a, o, t) =>
    tone(a, o, t, { freq: 520, freqEnd: 780, dur: 0.18, gain: 0.3, attack: 0.02 }),
  dictationStop: (a, o, t) =>
    tone(a, o, t, { freq: 780, freqEnd: 520, dur: 0.18, gain: 0.3, attack: 0.02 }),
};

const createNoiseBuffer = (audio: AudioContext) => {
  const length = audio.sampleRate;
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};

// Prepara el audio. Se llama en cada gesto del usuario (los navegadores no
// dejan sonar antes del primero) y reanuda el contexto si quedó suspendido.
export const unlockAudio = () => {
  try {
    if (!ctx) {
      const AudioContextClass: typeof AudioContext | undefined =
        window.AudioContext;
      if (typeof AudioContextClass !== "function") return;
      // iOS: respetar el modo silencio y no cortar la música del usuario
      if (navigator.audioSession) navigator.audioSession.type = "ambient";
      const audio = new AudioContextClass();
      const gain = audio.createGain();
      gain.gain.value = MASTER_GAIN;
      gain.connect(audio.destination);
      noiseBuffer = createNoiseBuffer(audio);
      ctx = audio;
      const createCategoryOut = (category: SoundCategoryId) => {
        const out = audio.createGain();
        out.gain.value = CATEGORY_GAIN[category];
        out.connect(gain);
        return out;
      };
      categoryOut = {
        typing: createCategoryOut("typing"),
        selection: createCategoryOut("selection"),
        actions: createCategoryOut("actions"),
      };
    }
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }
  } catch {
    ctx = null;
    categoryOut = null;
  }
};

export const playRecipe = (id: SoundId) => {
  // Si el contexto no está corriendo, el sonido quedaría encolado y saldría
  // tarde, todo junto: mejor no sonar
  if (!ctx || !categoryOut || ctx.state !== "running") return;
  if (document.visibilityState !== "visible") return;

  try {
    if (TYPING_SOUNDS.has(id)) {
      const now = performance.now();
      if (now - lastTypingAt < TYPING_MIN_INTERVAL_MS) return;
      lastTypingAt = now;
    }
    if (id === "hover") {
      const now = performance.now();
      if (now - lastHoverAt < HOVER_MIN_INTERVAL_MS) return;
      lastHoverAt = now;
    }

    const audioNow = ctx.currentTime;
    voiceEnds = voiceEnds.filter((end) => end > audioNow);
    if (voiceEnds.length >= MAX_VOICES) return;
    const t = audioNow + SCHEDULE_AHEAD_S;

    voiceEnds.push(RECIPES[id](ctx, categoryOut[SOUND_CATEGORY[id]], t));
  } catch {
    // Un sonido que falla no debe afectar a la app
  }
};
