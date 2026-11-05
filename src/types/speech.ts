// Tipos mínimos de la Web Speech API que no trae lib.dom de TypeScript.
// Los resultados se describen de forma estructural (lo que realmente se lee):
// los eventos reales del navegador cumplen esta forma y los tests pueden
// construirlos sin casts.

export interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}

export interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike;
}

export type SpeechRecognitionErrorCode =
  | "no-speech"
  | "aborted"
  | "audio-capture"
  | "network"
  | "not-allowed"
  | "service-not-allowed"
  | "language-not-supported"
  | "bad-grammar";

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike {
  error: SpeechRecognitionErrorCode;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type DictationMode = "toggle" | "hold";
export type DictationStatus = "idle" | "listening";

export type DictationMessageCode =
  | SpeechRecognitionErrorCode
  | "short-tap"
  | "restart-loop";

export interface DictationMessage {
  kind: "error" | "hint";
  code: DictationMessageCode;
  text: string;
}

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export const getSpeechRecognitionConstructor =
  (): SpeechRecognitionConstructor | null => {
    if (typeof window === "undefined") return null;
    const w = window as WindowWithSpeech;
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  };

/**
 * Chrome en Android, con `continuous = true`, entrega cada palabra como un
 * resultado final nuevo con todo el texto acumulado ("Hola", "Hola esto"...),
 * lo que repite el texto. Ahí se usa `continuous = false`: cada sesión entrega
 * una frase y el reinicio automático abre la siguiente.
 */
export const shouldUseContinuousRecognition = (userAgent: string): boolean =>
  !/Android/i.test(userAgent);
