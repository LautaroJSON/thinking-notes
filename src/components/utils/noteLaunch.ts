/*
  Animaciones del panel de la nota al abrirse y cerrarse.

  - "card": el panel sale desde la tarjeta de la nota en el sidebar y vuelve
    a ella al cerrarse, como al abrir/cerrar una app en iOS.
  - "sink": se hunde (se achica, se desenfoca y se desvanece).
  - "slide": sube al abrirse y baja al cerrarse, como una hoja.

  Al tocar una nota, el sidebar guarda de dónde salió el clic
  (setLaunchOrigin) y el panel lo consume al mostrarla (takeLaunchOrigin).
  Si la nota se abre por otro camino (crear una nota nueva, recargar), no
  hay origen y no se anima.
*/

import type { NoteAnimationId } from "./noteAnimation";

export interface LaunchRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PanelAnimation {
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  // Punto fijo de la transformación
  transformOrigin: string;
}

// Pasado este tiempo el origen se descarta: ya no corresponde a ese clic
const ORIGIN_TTL_MS = 1000;

// Curva de las animaciones de sistema de iOS: arranca rápido y frena suave
export const LAUNCH_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
export const LAUNCH_DURATION_MS = 500;
const CARD_CLOSE_DURATION_MS = 420;

let pending: { noteId: string; rect: LaunchRect; at: number } | null = null;

export const setLaunchOrigin = (noteId: string, rect: LaunchRect) => {
  pending = { noteId, rect, at: Date.now() };
};

export const takeLaunchOrigin = (noteId: string): LaunchRect | null => {
  const origin = pending;
  pending = null;
  if (!origin || origin.noteId !== noteId) return null;
  if (Date.now() - origin.at > ORIGIN_TTL_MS) return null;
  return origin.rect;
};

/*
  Fotogramas para llevar el panel (`to`) desde la tarjeta (`from`).
  Se escala parejo (sin deformar el contenido) hasta el ancho de la tarjeta
  y se recorta con clip-path a su alto, así lo visible coincide con la
  tarjeta. clip-path se mide en px del panel sin escalar, por eso se divide
  por la escala.
*/
export const launchKeyframes = (
  from: LaunchRect,
  to: LaunchRect,
  { fromRadius = 12, toRadius = 0 } = {},
): Keyframe[] | null => {
  if (to.width <= 0 || to.height <= 0 || from.width <= 0 || from.height <= 0) {
    return null;
  }

  const scale = Math.min(1, from.width / to.width);
  // Alto del panel (sin escalar) que se ve al principio, centrado
  const visibleHeight = Math.min(to.height, from.height / scale);
  const insetY = (to.height - visibleHeight) / 2;
  const insetX = Math.max(0, (to.width - from.width / scale) / 2);

  const translateX = from.left - to.left - insetX * scale;
  const translateY = from.top - to.top - insetY * scale;
  const radius = fromRadius / scale;

  return [
    {
      transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      clipPath: `inset(${insetY}px ${insetX}px round ${radius}px)`,
      opacity: 0,
    },
    { opacity: 1, offset: 0.3 },
    {
      transform: "translate(0px, 0px) scale(1)",
      clipPath: `inset(0px 0px round ${toRadius}px)`,
      opacity: 1,
    },
  ];
};

// Estado "cerrado" de las animaciones que no dependen de la tarjeta
const SINK_HIDDEN: Keyframe = {
  transform: "scale(0.92)",
  filter: "blur(8px)",
  opacity: 0,
};
const SINK_SHOWN: Keyframe = {
  transform: "scale(1)",
  filter: "blur(0px)",
  opacity: 1,
};
const SLIDE_HIDDEN: Keyframe = { transform: "translateY(18%)", opacity: 0 };
const SLIDE_SHOWN: Keyframe = { transform: "translateY(0%)", opacity: 1 };

interface AnimationTarget {
  // Tarjeta de la nota; sin ella, "card" se reemplaza por "sink"
  card?: LaunchRect | null;
  panel: LaunchRect;
  // Radio de las esquinas del panel
  radius?: number;
}

const resolveKind = (kind: NoteAnimationId, card?: LaunchRect | null) =>
  kind === "card" && !card ? "sink" : kind;

export const openAnimation = (
  kind: NoteAnimationId,
  { card, panel, radius = 0 }: AnimationTarget,
): PanelAnimation | null => {
  const resolved = resolveKind(kind, card);
  if (resolved === "card") {
    const keyframes = launchKeyframes(card!, panel, { toRadius: radius });
    if (!keyframes) return null;
    return {
      keyframes,
      options: { duration: LAUNCH_DURATION_MS, easing: LAUNCH_EASING },
      transformOrigin: "0 0",
    };
  }
  return {
    keyframes:
      resolved === "sink" ? [SINK_HIDDEN, SINK_SHOWN] : [SLIDE_HIDDEN, SLIDE_SHOWN],
    options: { duration: 450, easing: LAUNCH_EASING },
    transformOrigin: "50% 50%",
  };
};

export const closeAnimation = (
  kind: NoteAnimationId,
  { card, panel, radius = 0 }: AnimationTarget,
): PanelAnimation | null => {
  const resolved = resolveKind(kind, card);
  if (resolved === "card") {
    const keyframes = launchKeyframes(card!, panel, { toRadius: radius });
    if (!keyframes) return null;
    // Al revés que la apertura: se desvanece recién al llegar a la tarjeta
    const [cardFrame, , panelFrame] = keyframes;
    return {
      keyframes: [panelFrame, { opacity: 1, offset: 0.7 }, cardFrame],
      options: { duration: CARD_CLOSE_DURATION_MS, easing: LAUNCH_EASING },
      transformOrigin: "0 0",
    };
  }
  if (resolved === "sink") {
    return {
      keyframes: [SINK_SHOWN, SINK_HIDDEN],
      options: { duration: 320, easing: "cubic-bezier(0.4, 0, 0.6, 1)" },
      transformOrigin: "50% 50%",
    };
  }
  return {
    keyframes: [SLIDE_SHOWN, SLIDE_HIDDEN],
    options: { duration: 380, easing: "cubic-bezier(0.4, 0, 1, 1)" },
    transformOrigin: "50% 50%",
  };
};
