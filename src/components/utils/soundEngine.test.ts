import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// AudioContext falso: registra cuántas fuentes (osciladores o ruido) arrancan,
// que es lo que equivale a "sonó algo".
const param = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});

let started = 0;
let instances: FakeAudioContext[] = [];
let failOnOscillator = false;

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 8000;
  state: AudioContextState = "running";
  destination = {};
  resume = vi.fn(() => Promise.resolve());

  constructor() {
    instances.push(this);
  }

  createGain() {
    return { gain: param(), connect: vi.fn() };
  }
  createOscillator() {
    if (failOnOscillator) throw new Error("boom");
    return {
      type: "sine",
      frequency: param(),
      connect: vi.fn(),
      start: vi.fn(() => started++),
      stop: vi.fn(),
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(() => started++),
      stop: vi.fn(),
    };
  }
  createBiquadFilter() {
    return { type: "bandpass", frequency: param(), Q: param(), connect: vi.fn() };
  }
  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

const loadEngine = async () => {
  vi.resetModules();
  return import("./soundEngine");
};

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
};

let now = 0;

describe("soundEngine", () => {
  beforeEach(() => {
    started = 0;
    instances = [];
    failOnOscillator = false;
    now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("AudioContext", FakeAudioContext);
    setVisibility("visible");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setVisibility("visible");
    Reflect.deleteProperty(navigator, "audioSession");
  });

  it("sin AudioContext en el navegador no lanza", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const { unlockAudio, playRecipe } = await loadEngine();
    expect(() => unlockAudio()).not.toThrow();
    expect(() => playRecipe("select")).not.toThrow();
  });

  it("antes del primer gesto no crea nada ni suena", async () => {
    const { playRecipe } = await loadEngine();
    playRecipe("select");
    expect(instances).toHaveLength(0);
    expect(started).toBe(0);
  });

  it("después de desbloquear, reproduce", async () => {
    const { unlockAudio, playRecipe } = await loadEngine();
    unlockAudio();
    unlockAudio();
    expect(instances).toHaveLength(1);
    playRecipe("select");
    expect(started).toBeGreaterThan(0);
  });

  it("reanuda el contexto si quedó suspendido", async () => {
    const { unlockAudio } = await loadEngine();
    unlockAudio();
    instances[0].state = "suspended";
    unlockAudio();
    expect(instances[0].resume).toHaveBeenCalled();
  });

  it("con la pestaña oculta no suena", async () => {
    const { unlockAudio, playRecipe } = await loadEngine();
    unlockAudio();
    setVisibility("hidden");
    playRecipe("create");
    expect(started).toBe(0);
  });

  it("dos teclas a menos de 35 ms suenan una sola vez", async () => {
    const { unlockAudio, playRecipe } = await loadEngine();
    unlockAudio();
    playRecipe("key");
    const afterFirst = started;
    expect(afterFirst).toBeGreaterThan(0);

    now += 20;
    playRecipe("key");
    expect(started).toBe(afterFirst);

    now += 20;
    playRecipe("key");
    expect(started).toBe(afterFirst * 2);
  });

  it("descarta sonidos por encima de 6 voces simultáneas", async () => {
    const { unlockAudio, playRecipe } = await loadEngine();
    unlockAudio();
    for (let i = 0; i < 7; i++) playRecipe("select");
    // "select" usa una sola fuente
    expect(started).toBe(6);
  });

  it("las voces terminadas liberan lugar", async () => {
    const { unlockAudio, playRecipe } = await loadEngine();
    unlockAudio();
    for (let i = 0; i < 6; i++) playRecipe("select");
    instances[0].currentTime = 5;
    playRecipe("select");
    expect(started).toBe(7);
  });

  it("pide la sesión de audio ambient donde existe (iOS)", async () => {
    const session = { type: "auto" };
    Object.defineProperty(navigator, "audioSession", {
      configurable: true,
      value: session,
    });
    const { unlockAudio } = await loadEngine();
    unlockAudio();
    expect(session.type).toBe("ambient");
  });

  it("si la síntesis falla no propaga el error", async () => {
    const { unlockAudio, playRecipe } = await loadEngine();
    unlockAudio();
    failOnOscillator = true;
    expect(() => playRecipe("select")).not.toThrow();
  });

  it("todas las recetas se pueden reproducir", async () => {
    const { unlockAudio, playRecipe } = await loadEngine();
    unlockAudio();
    const ids = [
      "key",
      "delete",
      "enter",
      "select",
      "close",
      "noteOpen",
      "noteClose",
      "panelOpen",
      "panelClose",
      "create",
      "send",
      "remove",
      "copy",
      "drop",
      "paste",
      "dictationStart",
      "dictationStop",
    ] as const;
    for (const id of ids) {
      instances[0].currentTime += 10;
      now += 100;
      const before = started;
      playRecipe(id);
      expect(started, id).toBeGreaterThan(before);
    }
  });
});
