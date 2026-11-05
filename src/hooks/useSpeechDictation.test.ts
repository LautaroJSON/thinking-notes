import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSpeechDictation } from "./useSpeechDictation";
import { shouldUseContinuousRecognition } from "@/types/speech";
import {
  createFakeSpeechRecognition,
  FakeSpeechRecognition,
} from "./test-utils/fakeSpeechRecognition";

const setup = () => {
  const fake = createFakeSpeechRecognition();
  const onFinalText = vi.fn();
  const hook = renderHook(() =>
    useSpeechDictation({ onFinalText, recognitionConstructor: fake.Ctor }),
  );
  return { ...fake, onFinalText, hook };
};

describe("useSpeechDictation — toggle (US1)", () => {
  it("C1: sin soporte, isSupported es false y start no hace nada", () => {
    const { result } = renderHook(() =>
      useSpeechDictation({ onFinalText: vi.fn(), recognitionConstructor: null }),
    );

    expect(result.current.isSupported).toBe(false);
    act(() => result.current.start("toggle"));
    expect(result.current.status).toBe("idle");
  });

  it("C2: start configura el reconocedor en es-AR y pasa a listening", () => {
    const { hook, last } = setup();

    act(() => hook.result.current.start("toggle"));

    const rec = last();
    expect(rec.lang).toBe("es-AR");
    expect(rec.continuous).toBe(true);
    expect(rec.interimResults).toBe(true);
    expect(rec.startCalls).toBe(1);
    expect(hook.result.current.status).toBe("listening");
    expect(hook.result.current.mode).toBe("toggle");
    expect(hook.result.current.message).toBeNull();
  });

  it("C3: los resultados provisorios se exponen en interimText", () => {
    const { hook, last, onFinalText } = setup();
    act(() => hook.result.current.start("toggle"));

    act(() => last().emitResult([{ transcript: "hola qué", isFinal: false }]));

    expect(hook.result.current.interimText).toBe("hola qué");
    expect(onFinalText).not.toHaveBeenCalled();
  });

  it("C4: un resultado final se entrega una vez y limpia el provisorio", () => {
    const { hook, last, onFinalText } = setup();
    act(() => hook.result.current.start("toggle"));
    act(() => last().emitResult([{ transcript: "hola", isFinal: false }]));

    act(() => last().emitResult([{ transcript: " hola mundo ", isFinal: true }]));
    act(() => last().emitResult([{ transcript: "otra", isFinal: false }]));

    expect(onFinalText).toHaveBeenCalledTimes(1);
    expect(onFinalText).toHaveBeenCalledWith("hola mundo");
    expect(hook.result.current.interimText).toBe("otra");
  });

  it("C5: si el motor corta solo (silencio), se reinicia y sigue escuchando", () => {
    const { hook, instances, last } = setup();
    act(() => hook.result.current.start("toggle"));

    act(() => last().emitError("no-speech"));
    act(() => last().emitEnd());

    expect(instances).toHaveLength(2);
    expect(last().startCalls).toBe(1);
    expect(hook.result.current.status).toBe("listening");
    expect(hook.result.current.message).toBeNull();
  });

  it("C7: stop finaliza; los finales que llegan antes de onend se entregan", () => {
    const { hook, instances, last, onFinalText } = setup();
    act(() => hook.result.current.start("toggle"));
    const rec = last();
    act(() => rec.emitResult([{ transcript: "casi", isFinal: false }]));

    act(() => hook.result.current.stop());
    expect(rec.stopCalls).toBe(1);
    expect(hook.result.current.status).toBe("idle");

    act(() => rec.emitResult([{ transcript: "casi listo", isFinal: true }]));
    act(() => rec.emitEnd());

    expect(onFinalText).toHaveBeenCalledWith("casi listo");
    expect(instances).toHaveLength(1);
    expect(hook.result.current.interimText).toBe("");
  });

  it("C8: cancel aborta y descarta lo pendiente", () => {
    const { hook, instances, last, onFinalText } = setup();
    act(() => hook.result.current.start("toggle"));
    const rec = last();
    act(() => rec.emitResult([{ transcript: "no va", isFinal: false }]));

    act(() => hook.result.current.cancel());
    act(() => rec.emitResult([{ transcript: "no va", isFinal: true }]));
    act(() => rec.emitError("aborted"));
    act(() => rec.emitEnd());

    expect(rec.abortCalls).toBe(1);
    expect(onFinalText).not.toHaveBeenCalled();
    expect(instances).toHaveLength(1);
    expect(hook.result.current.status).toBe("idle");
    expect(hook.result.current.interimText).toBe("");
    expect(hook.result.current.mode).toBeNull();
  });

  it("C9: resetSegment descarta el fragmento en curso y sigue escuchando", () => {
    const { hook, instances, last, onFinalText } = setup();
    act(() => hook.result.current.start("toggle"));
    const rec = last();
    act(() => rec.emitResult([{ transcript: "ya enviado", isFinal: false }]));

    act(() => hook.result.current.resetSegment());
    expect(rec.abortCalls).toBe(1);
    expect(hook.result.current.interimText).toBe("");

    act(() => rec.emitResult([{ transcript: "ya enviado", isFinal: true }]));
    act(() => rec.emitError("aborted"));
    act(() => rec.emitEnd());

    expect(onFinalText).not.toHaveBeenCalled();
    expect(instances).toHaveLength(2);
    expect(hook.result.current.status).toBe("listening");

    act(() => last().emitResult([{ transcript: "nuevo", isFinal: true }]));
    expect(onFinalText).toHaveBeenCalledWith("nuevo");
  });

  it("C11: el error aborted provocado por nosotros se ignora", () => {
    const { hook, last } = setup();
    act(() => hook.result.current.start("toggle"));

    act(() => hook.result.current.resetSegment());
    act(() => last().emitError("aborted"));

    expect(hook.result.current.status).toBe("listening");
    expect(hook.result.current.message).toBeNull();
  });

  it("C12: al desmontar aborta y no se reinicia", () => {
    const { hook, instances, last } = setup();
    act(() => hook.result.current.start("toggle"));
    const rec = last();

    hook.unmount();
    rec.emitEnd();

    expect(rec.abortCalls).toBe(1);
    expect(instances).toHaveLength(1);
  });

  it("volver a activar mientras el anterior termina reanuda al llegar onend", () => {
    const { hook, instances, last } = setup();
    act(() => hook.result.current.start("toggle"));
    const rec = last();
    act(() => hook.result.current.stop());

    act(() => hook.result.current.start("toggle"));
    expect(hook.result.current.status).toBe("listening");
    expect(instances).toHaveLength(1);

    act(() => rec.emitEnd());
    expect(instances).toHaveLength(2);
    expect(last().startCalls).toBe(1);
  });
});

describe("useSpeechDictation — mantener presionado (US2)", () => {
  it("start('hold') deja mode en hold", () => {
    const { hook } = setup();

    act(() => hook.result.current.start("hold"));

    expect(hook.result.current.mode).toBe("hold");
    expect(hook.result.current.status).toBe("listening");
  });

  it("C7 en hold: al soltar se entregan los finales pendientes", () => {
    const { hook, last, onFinalText } = setup();
    act(() => hook.result.current.start("hold"));
    const rec = last();

    act(() => hook.result.current.stop());
    act(() => rec.emitResult([{ transcript: "al soltar", isFinal: true }]));
    act(() => rec.emitEnd());

    expect(onFinalText).toHaveBeenCalledWith("al soltar");
    expect(hook.result.current.status).toBe("idle");
  });

  it("showHint muestra la pista de toque corto y clearMessage la limpia", () => {
    const { hook } = setup();

    act(() => hook.result.current.showHint("short-tap"));
    expect(hook.result.current.message).toEqual({
      kind: "hint",
      code: "short-tap",
      text: "Mantené presionado para dictar.",
    });

    act(() => hook.result.current.clearMessage());
    expect(hook.result.current.message).toBeNull();
  });

  it("start limpia un mensaje previo", () => {
    const { hook } = setup();
    act(() => hook.result.current.showHint("short-tap"));

    act(() => hook.result.current.start("hold"));

    expect(hook.result.current.message).toBeNull();
  });
});

describe("useSpeechDictation — errores y avisos (US3)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["not-allowed", "Habilitá el permiso del micrófono para dictar."],
    ["service-not-allowed", "El dictado no está disponible en este navegador."],
    ["language-not-supported", "El dictado no está disponible en este navegador."],
    ["audio-capture", "No se encontró un micrófono."],
    ["network", "El dictado necesita conexión a internet."],
  ] as const)("C10: el error %s apaga el dictado y avisa", (code, text) => {
    const { hook, instances, last } = setup();
    act(() => hook.result.current.start("toggle"));
    act(() => last().emitResult([{ transcript: "pendiente", isFinal: false }]));

    act(() => last().emitError(code));
    act(() => last().emitEnd());

    expect(hook.result.current.status).toBe("idle");
    expect(hook.result.current.interimText).toBe("");
    expect(hook.result.current.message).toEqual({ kind: "error", code, text });
    expect(instances).toHaveLength(1);
  });

  it("si start() del navegador lanza, se avisa que no está disponible", () => {
    const Throwing = class extends FakeSpeechRecognition {
      start() {
        throw new Error("InvalidStateError");
      }
    };
    const { result } = renderHook(() =>
      useSpeechDictation({ onFinalText: vi.fn(), recognitionConstructor: Throwing }),
    );

    act(() => result.current.start("toggle"));

    expect(result.current.status).toBe("idle");
    expect(result.current.message?.code).toBe("service-not-allowed");
  });

  it("SC-004: lo ya entregado antes de un error no se pierde", () => {
    const { hook, last, onFinalText } = setup();
    act(() => hook.result.current.start("toggle"));

    act(() => last().emitResult([{ transcript: "quedó", isFinal: true }]));
    act(() => last().emitError("network"));

    expect(onFinalText).toHaveBeenCalledWith("quedó");
    expect(onFinalText).toHaveBeenCalledTimes(1);
  });

  it("C6: muchos reinicios seguidos sin resultados cortan el dictado", () => {
    vi.useFakeTimers();
    const { hook, instances, last } = setup();
    act(() => hook.result.current.start("toggle"));

    for (let i = 0; i < 4; i++) {
      act(() => last().emitEnd());
    }

    expect(hook.result.current.status).toBe("idle");
    expect(hook.result.current.message).toEqual({
      kind: "error",
      code: "restart-loop",
      text: "No se pudo mantener el dictado activo.",
    });
    expect(instances).toHaveLength(4);
  });

  it("C6: un resultado entre reinicios reinicia el contador", () => {
    vi.useFakeTimers();
    const { hook, last } = setup();
    act(() => hook.result.current.start("toggle"));

    for (let i = 0; i < 6; i++) {
      act(() => last().emitResult([{ transcript: "algo", isFinal: false }]));
      act(() => last().emitEnd());
    }

    expect(hook.result.current.status).toBe("listening");
  });

  it("C6: reinicios espaciados en el tiempo no cuentan como bucle", () => {
    vi.useFakeTimers();
    const { hook, last } = setup();
    act(() => hook.result.current.start("toggle"));

    for (let i = 0; i < 6; i++) {
      act(() => vi.advanceTimersByTime(1000));
      act(() => last().emitEnd());
    }

    expect(hook.result.current.status).toBe("listening");
  });

  it("C13: el mensaje se limpia solo a los 4 segundos", () => {
    vi.useFakeTimers();
    const { hook, last } = setup();
    act(() => hook.result.current.start("toggle"));
    act(() => last().emitError("not-allowed"));

    act(() => vi.advanceTimersByTime(3999));
    expect(hook.result.current.message).not.toBeNull();

    act(() => vi.advanceTimersByTime(1));
    expect(hook.result.current.message).toBeNull();
  });
});

describe("useSpeechDictation — Android (fix de texto repetido)", () => {
  // Chrome en Android, con continuous=true, manda cada palabra como un final
  // nuevo con TODO el texto acumulado: "Hola", "Hola esto", "Hola esto es"...
  const setupAndroid = () => {
    const fake = createFakeSpeechRecognition();
    const onFinalText = vi.fn();
    const hook = renderHook(() =>
      useSpeechDictation({
        onFinalText,
        recognitionConstructor: fake.Ctor,
        continuous: false,
      }),
    );
    return { ...fake, onFinalText, hook };
  };

  it("con continuous=false cada frase se entrega una sola vez", () => {
    const { hook, last, onFinalText } = setupAndroid();
    act(() => hook.result.current.start("hold"));
    expect(last().continuous).toBe(false);

    act(() => last().emitResult([{ transcript: "hola esto", isFinal: false }]));
    act(() =>
      last().emitResult([{ transcript: "hola esto es una nota", isFinal: true }]),
    );
    act(() => last().emitEnd());

    act(() => last().emitResult([{ transcript: "espero que", isFinal: false }]));
    act(() =>
      last().emitResult([
        { transcript: "espero que se escriba bien", isFinal: true },
      ]),
    );

    expect(onFinalText.mock.calls).toEqual([
      ["hola esto es una nota"],
      ["espero que se escriba bien"],
    ]);
    expect(hook.result.current.status).toBe("listening");
  });

  it("frases cortas seguidas no disparan la guarda anti-bucle", () => {
    vi.useFakeTimers();
    const { hook, last } = setupAndroid();
    act(() => hook.result.current.start("hold"));

    for (let i = 0; i < 6; i++) {
      act(() => last().emitResult([{ transcript: `frase ${i}`, isFinal: true }]));
      act(() => last().emitEnd());
    }

    expect(hook.result.current.status).toBe("listening");
    vi.useRealTimers();
  });
});

describe("shouldUseContinuousRecognition", () => {
  it.each([
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
      false,
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      true,
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      true,
    ],
  ])("%s → %s", (userAgent, expected) => {
    expect(shouldUseContinuousRecognition(userAgent)).toBe(expected);
  });
});
