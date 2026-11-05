import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSpeechRecognitionConstructor,
  type DictationMessage,
  type DictationMode,
  type DictationStatus,
  type SpeechRecognitionConstructor,
  type SpeechRecognitionErrorCode,
  type SpeechRecognitionLike,
} from "@/types/speech";

const LANG = "es-AR";

const HINT_MESSAGES: Record<"short-tap", string> = {
  "short-tap": "Mantené presionado para dictar.",
};

const UNAVAILABLE = "El dictado no está disponible en este navegador.";
const ERROR_MESSAGES: Record<FatalErrorCode, string> = {
  "not-allowed": "Habilitá el permiso del micrófono para dictar.",
  "service-not-allowed": UNAVAILABLE,
  "language-not-supported": UNAVAILABLE,
  "bad-grammar": UNAVAILABLE,
  "audio-capture": "No se encontró un micrófono.",
  network: "El dictado necesita conexión a internet.",
  "restart-loop": "No se pudo mantener el dictado activo.",
};

/** Tiempo que queda visible un aviso. */
const MESSAGE_TIMEOUT_MS = 4000;
/** Guarda anti-bucle: más de MAX_RESTARTS reinicios en RESTART_WINDOW_MS sin resultados. */
const MAX_RESTARTS = 3;
const RESTART_WINDOW_MS = 2000;

// Errores que no apagan el dictado: el silencio se reanuda y "aborted" lo provocamos nosotros.
const RECOVERABLE_ERRORS = ["no-speech", "aborted"] as const;
type RecoverableErrorCode = (typeof RECOVERABLE_ERRORS)[number];
type FatalErrorCode =
  | Exclude<SpeechRecognitionErrorCode, RecoverableErrorCode>
  | "restart-loop";

const isRecoverable = (
  code: SpeechRecognitionErrorCode,
): code is RecoverableErrorCode =>
  (RECOVERABLE_ERRORS as readonly string[]).includes(code);

interface Session {
  recognition: SpeechRecognitionLike;
  /** false cuando abortamos: sus eventos se ignoran. */
  accepting: boolean;
}

export interface UseSpeechDictationOptions {
  /** Se llama una vez por cada fragmento reconocido como final. */
  onFinalText: (text: string) => void;
  /**
   * Constructor del reconocedor. `undefined` = detectar en el navegador;
   * `null` = sin soporte. Existe para los tests.
   */
  recognitionConstructor?: SpeechRecognitionConstructor | null;
}

export interface UseSpeechDictationResult {
  isSupported: boolean;
  status: DictationStatus;
  mode: DictationMode | null;
  interimText: string;
  message: DictationMessage | null;
  start: (mode: DictationMode) => void;
  stop: () => void;
  cancel: () => void;
  resetSegment: () => void;
  showHint: (code: "short-tap") => void;
  clearMessage: () => void;
}

export const useSpeechDictation = ({
  onFinalText,
  recognitionConstructor,
}: UseSpeechDictationOptions): UseSpeechDictationResult => {
  const [Ctor] = useState<SpeechRecognitionConstructor | null>(() =>
    recognitionConstructor === undefined
      ? getSpeechRecognitionConstructor()
      : recognitionConstructor,
  );
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [mode, setMode] = useState<DictationMode | null>(null);
  const [interimText, setInterimText] = useState("");
  const [message, setMessage] = useState<DictationMessage | null>(null);

  const onFinalTextRef = useRef(onFinalText);
  const sessionRef = useRef<Session | null>(null);
  /** Intención del usuario: mientras sea true, un corte del motor se reanuda. */
  const wantsListeningRef = useRef(false);
  /** Para que el onend de una sesión pueda abrir la siguiente. */
  const openSessionRef = useRef<() => void>(() => {});
  /** Momentos de los reinicios automáticos sin resultados en el medio. */
  const restartLogRef = useRef<number[]>([]);
  const messageTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onFinalTextRef.current = onFinalText;
  }, [onFinalText]);

  const clearMessage = useCallback(() => {
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
      messageTimerRef.current = null;
    }
    setMessage(null);
  }, []);

  const showMessage = useCallback((next: DictationMessage) => {
    if (messageTimerRef.current !== null) {
      window.clearTimeout(messageTimerRef.current);
    }
    setMessage(next);
    messageTimerRef.current = window.setTimeout(() => {
      messageTimerRef.current = null;
      setMessage(null);
    }, MESSAGE_TIMEOUT_MS);
  }, []);

  const goIdle = useCallback(() => {
    wantsListeningRef.current = false;
    setStatus("idle");
    setMode(null);
    setInterimText("");
  }, []);

  const failWith = useCallback(
    (session: Session | null, code: FatalErrorCode) => {
      if (session) {
        session.accepting = false;
        session.recognition.abort();
        if (sessionRef.current === session) sessionRef.current = null;
      }
      goIdle();
      showMessage({ kind: "error", code, text: ERROR_MESSAGES[code] });
    },
    [goIdle, showMessage],
  );

  const openSession = useCallback(() => {
    if (!Ctor) return;
    const recognition = new Ctor();
    const session: Session = { recognition, accepting: true };
    recognition.lang = LANG;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      if (!session.accepting) return;
      restartLogRef.current = [];
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += transcript;
        else interim += transcript;
      }
      const cleanFinal = finalText.trim();
      if (cleanFinal) onFinalTextRef.current(cleanFinal);
      setInterimText(interim.trim());
    };

    recognition.onerror = (event) => {
      if (!session.accepting) return;
      if (isRecoverable(event.error)) return;
      failWith(session, event.error);
    };

    recognition.onend = () => {
      if (sessionRef.current !== session) return;
      sessionRef.current = null;
      if (wantsListeningRef.current) {
        const now = Date.now();
        const recent = restartLogRef.current.filter(
          (t) => now - t < RESTART_WINDOW_MS,
        );
        recent.push(now);
        restartLogRef.current = recent;
        if (recent.length > MAX_RESTARTS) {
          failWith(null, "restart-loop");
          return;
        }
        openSessionRef.current();
      } else {
        setInterimText("");
      }
    };

    sessionRef.current = session;
    try {
      recognition.start();
    } catch {
      // Por ejemplo, iOS como PWA instalada: el constructor existe pero no arranca
      failWith(session, "service-not-allowed");
    }
  }, [Ctor, failWith]);

  useEffect(() => {
    openSessionRef.current = openSession;
  }, [openSession]);

  const start = useCallback(
    (nextMode: DictationMode) => {
      if (!Ctor || wantsListeningRef.current) return;
      wantsListeningRef.current = true;
      clearMessage();
      restartLogRef.current = [];
      setStatus("listening");
      setMode(nextMode);
      // Si la sesión anterior todavía está terminando, se reanuda en su onend.
      if (!sessionRef.current) openSession();
    },
    [Ctor, openSession, clearMessage],
  );

  const stop = useCallback(() => {
    if (!wantsListeningRef.current) return;
    wantsListeningRef.current = false;
    setStatus("idle");
    setMode(null);
    // stop() (no abort): el motor entrega como final lo que tenía provisorio.
    sessionRef.current?.recognition.stop();
  }, []);

  const cancel = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      session.accepting = false;
      session.recognition.abort();
    }
    goIdle();
  }, [goIdle]);

  const resetSegment = useCallback(() => {
    const session = sessionRef.current;
    if (!wantsListeningRef.current || !session) return;
    // Se descarta lo pendiente; el onend de esta sesión abre una nueva.
    session.accepting = false;
    session.recognition.abort();
    restartLogRef.current = [];
    setInterimText("");
  }, []);

  const showHint = useCallback(
    (code: "short-tap") => {
      showMessage({ kind: "hint", code, text: HINT_MESSAGES[code] });
    },
    [showMessage],
  );

  // Al desmontar: abortar sin reanudar.
  useEffect(
    () => () => {
      wantsListeningRef.current = false;
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) {
        session.accepting = false;
        session.recognition.abort();
      }
      if (messageTimerRef.current !== null) {
        window.clearTimeout(messageTimerRef.current);
      }
    },
    [],
  );

  return {
    isSupported: Ctor !== null,
    status,
    mode,
    interimText,
    message,
    start,
    stop,
    cancel,
    resetSegment,
    showHint,
    clearMessage,
  };
};
