/*
  Animación de "abrir app": el panel de la nota sale desde la tarjeta de la
  nota en el sidebar y crece hasta su lugar, como al abrir una app en iOS.

  El sidebar guarda de dónde salió el clic (setLaunchOrigin) y el panel lo
  consume al mostrar esa nota (takeLaunchOrigin). Si la nota se abre por
  otro camino (crear una nota nueva, recargar), no hay origen y no se anima.
*/

export interface LaunchRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Pasado este tiempo el origen se descarta: ya no corresponde a ese clic
const ORIGIN_TTL_MS = 1000;

// Curva de las animaciones de sistema de iOS: arranca rápido y frena suave
export const LAUNCH_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
export const LAUNCH_DURATION_MS = 500;

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
