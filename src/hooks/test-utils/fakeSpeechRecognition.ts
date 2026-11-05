import type {
  SpeechRecognitionConstructor,
  SpeechRecognitionErrorCode,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
  SpeechRecognitionResultLike,
} from "@/types/speech";

export interface FakeResult {
  transcript: string;
  isFinal: boolean;
}

/** Reconocedor de voz falso para tests: registra llamadas y permite emitir eventos. */
export class FakeSpeechRecognition implements SpeechRecognitionLike {
  lang = "";
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: { error: SpeechRecognitionErrorCode }) => void) | null =
    null;
  onend: (() => void) | null = null;

  startCalls = 0;
  stopCalls = 0;
  abortCalls = 0;

  /** Resultados acumulados de la sesión (como en continuous=true). */
  private history: SpeechRecognitionResultLike[] = [];

  start() {
    this.startCalls += 1;
  }

  stop() {
    this.stopCalls += 1;
  }

  abort() {
    this.abortCalls += 1;
  }

  /**
   * Emite resultados nuevos. Los resultados finales previos quedan en la lista
   * y `resultIndex` apunta al primero nuevo, como hace el navegador.
   */
  emitResult(results: FakeResult[]) {
    const finals = this.history.filter((r) => r.isFinal);
    const fresh = results.map((r) =>
      Object.assign([{ transcript: r.transcript }], { isFinal: r.isFinal }),
    );
    this.history = [...finals, ...fresh];
    this.onresult?.({ resultIndex: finals.length, results: this.history });
  }

  emitError(error: SpeechRecognitionErrorCode) {
    this.onerror?.({ error });
  }

  emitEnd() {
    this.onend?.();
  }
}

/** Crea un constructor falso que guarda todas las instancias creadas. */
export const createFakeSpeechRecognition = () => {
  const instances: FakeSpeechRecognition[] = [];
  const Ctor: SpeechRecognitionConstructor = class extends FakeSpeechRecognition {
    constructor() {
      super();
      instances.push(this);
    }
  };
  const last = () => {
    const instance = instances[instances.length - 1];
    if (!instance) throw new Error("No se creó ningún reconocedor");
    return instance;
  };
  return { Ctor, instances, last };
};
