# Contract: `useSpeechDictation` (hook) y utilidades de texto

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

Este es el contrato interno entre la lógica de dictado y la UI. La UI ([dictation-button-ui.md](./dictation-button-ui.md)) solo depende de esta interfaz, y los tests de Vitest la verifican con un `SpeechRecognition` falso.

## Firma

```ts
// src/hooks/useSpeechDictation.ts
type DictationMode = "toggle" | "hold";
type DictationStatus = "idle" | "listening";

interface UseSpeechDictationOptions {
  /** Se llama una vez por cada fragmento reconocido como final. */
  onFinalText: (text: string) => void;
  /**
   * Constructor del reconocedor. `undefined` (por defecto) = detectar
   * window.SpeechRecognition ?? window.webkitSpeechRecognition; `null` = sin soporte.
   * Existe para inyectar el reconocedor falso en los tests. El idioma es siempre "es-AR".
   */
  recognitionConstructor?: SpeechRecognitionConstructor | null;
}

interface UseSpeechDictationResult {
  isSupported: boolean;
  status: DictationStatus;
  mode: DictationMode | null;
  interimText: string;
  message: DictationMessage | null;
  start: (mode: DictationMode) => void;
  stop: () => void;          // finaliza: lo provisorio se entrega como final
  cancel: () => void;        // aborta: descarta lo pendiente
  resetSegment: () => void;  // abort + reinicio, sin cambiar status (Enter durante el dictado)
  showHint: (code: "short-tap") => void;
  clearMessage: () => void;
}
```

## Comportamiento garantizado

| # | Dado | Cuando | Entonces |
|---|---|---|---|
| C1 | `isSupported === false` | se llama `start` | no hace nada; `status` sigue en `idle` |
| C2 | `idle` | `start("toggle")` | crea el reconocedor con `lang="es-AR"`, `continuous=true`, `interimResults=true`, llama `start()`; `status="listening"`, `mode="toggle"`, `message=null` |
| C3 | `listening` | llega un resultado provisorio | `interimText` = concatenación de los resultados no finales del evento |
| C4 | `listening` | llega un resultado final | `onFinalText(texto.trim())` una sola vez; `interimText` se vacía (si no quedan provisorios) |
| C5 | `listening`, con intención activa | `onend` no pedido o error `no-speech` | se reinicia con `start()`; `status` sigue en `listening` |
| C6 | reinicios | más de 3 reinicios en menos de 2 s sin resultados | `status="idle"`; `message.code="restart-loop"` |
| C7 | `listening` | `stop()` | intención en falso, `recognition.stop()`, `status="idle"`; los finales que lleguen antes de `onend` se siguen entregando |
| C8 | `listening` | `cancel()` | intención en falso, `recognition.abort()`, `status="idle"`, `interimText=""`; no se llama más a `onFinalText` de esa sesión |
| C9 | `listening` | `resetSegment()` | `abort()` y reinicio; `interimText=""`; los resultados del fragmento abortado no se entregan |
| C10 | `listening` | error fatal (`not-allowed`, `service-not-allowed`, `audio-capture`, `network`, `language-not-supported`) | `status="idle"`, sin reinicio, `message` con el texto de research R10 |
| C11 | cualquiera | error `aborted` provocado por `cancel`/`resetSegment` | se ignora |
| C12 | cualquiera | desmontaje del componente | equivale a `cancel()`; no quedan listeners ni micrófono abierto |
| C13 | `message` visible | pasan 4 s, o se llama `start` | `message=null` |

## Utilidades puras

```ts
// src/components/utils/dictation.ts
appendTranscript(base: string, chunk: string): string
composeDraft(draft: string, interim: string): string
stripInterim(value: string, interim: string): string
```

| # | Función | Entrada | Salida |
|---|---|---|---|
| U1 | `appendTranscript` | `("", "hola")` | `"hola"` |
| U2 | `appendTranscript` | `("idea", "nueva")` | `"idea nueva"` |
| U3 | `appendTranscript` | `("idea ", " nueva ")` | `"idea nueva"` |
| U4 | `appendTranscript` | `("línea\n", "otra")` | `"línea\notra"` (no agrega espacio tras salto de línea) |
| U5 | `appendTranscript` | `("idea", "   ")` | `"idea"` (chunk vacío no modifica) |
| U6 | `composeDraft` | `("idea", "")` | `"idea"` |
| U7 | `composeDraft` | `("idea", "en curso")` | `"idea en curso"` (misma regla que `appendTranscript`) |
| U8 | `stripInterim` | `("idea en cursox", "en curso")` | `"idea en cursox"` (si el usuario editó el sufijo, no se toca) |
| U9 | `stripInterim` | `("idea en curso", "en curso")` | `"idea"` |
| U10 | `stripInterim` | `(v, "")` | `v` |
