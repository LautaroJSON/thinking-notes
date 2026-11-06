// Tipo mínimo de la Audio Session API (Safari iOS 17+), que todavía no trae
// lib.dom de TypeScript. Con type = "ambient" el audio respeta el interruptor
// de silencio del iPhone y no corta la música del usuario.

type AudioSessionType =
  | "auto"
  | "playback"
  | "transient"
  | "transient-solo"
  | "ambient"
  | "play-and-record";

interface AudioSessionLike {
  type: AudioSessionType;
}

interface Navigator {
  readonly audioSession?: AudioSessionLike;
}
