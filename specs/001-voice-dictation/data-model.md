# Data Model: Dictado por voz en la nota

**Feature**: [spec.md](./spec.md) | **Fecha**: 2026-11-05

Esta funcionalidad **no agrega datos persistidos**. No cambia `INotes`, no toca `localStorage` ni la API remota. Todo el estado es efímero y vive en memoria mientras la nota está abierta.

## Entidad: Sesión de dictado (en memoria, hook `useSpeechDictation`)

| Campo | Tipo | Descripción |
|---|---|---|
| `status` | `"idle" \| "listening"` | Estado real expuesto a la UI. Es `"listening"` solo si el motor está efectivamente escuchando o reiniciándose dentro de una intención activa. |
| `mode` | `"toggle" \| "hold" \| null` | Cómo se activó la sesión actual. `null` en `idle`. |
| `interimText` | `string` | Texto provisorio del fragmento en curso. Se reemplaza con cada resultado y se vacía al llegar el final. |
| `message` | `DictationMessage \| null` | Último aviso para mostrar (error o pista). |
| `isSupported` | `boolean` | Si el navegador expone el reconocedor. Constante por sesión de la página. |
| *(interno)* `wantsListening` | `boolean` (ref) | Intención del usuario. Gobierna el reinicio automático (research R3). |
| *(interno)* `restartLog` | `number[]` (ref) | Timestamps de reinicios sin resultados, para la guarda anti-bucle. |

### `DictationMessage`

| Campo | Tipo | Descripción |
|---|---|---|
| `kind` | `"error" \| "hint"` | `error` para fallos y `hint` para la pista de toque corto. |
| `code` | `DictationErrorCode \| "short-tap" \| "restart-loop"` | Código que lo originó. |
| `text` | `string` | Mensaje en español (tabla de research R10). |

### Validaciones y reglas

- `interimText` nunca se persiste: solo llega a la idea si el usuario confirma con Enter mientras está visible (research R6).
- El texto final de cada fragmento se entrega una sola vez vía `onFinalText`. No se reenvía después de `resetSegment()` ni de `stop()`.
- `lang` es siempre `"es-AR"` (FR-009).

## Transiciones de estado

```text
                 start(mode)                     onresult(final)
   ┌──────┐ ─────────────────────► ┌───────────┐ ──► onFinalText(text)
   │ idle │                        │ listening │ ◄─┐
   └──────┘ ◄───────────────────── └───────────┘   │ onend no pedido + wantsListening
       ▲     stop() | error fatal       │          │ → start() (reinicio, R3)
       │     | cambio de nota           └──────────┘
       │     | visibilitychange hidden
       │     | guarda anti-bucle
       │
       └── en hold: pointerup / pointercancel / pointerleave / blur → stop()
```

- `idle → listening`: `start("toggle")` (clic o teclado) o `start("hold")` (`pointerdown` táctil). Si el motor falla al arrancar, vuelve a `idle` con `message`.
- `listening → listening`: reinicio transparente tras un `onend` no pedido o un `no-speech`, o tras `resetSegment()`.
- `listening → idle` por `stop()` (soltar, segundo clic): se llama `recognition.stop()`, no `abort()`, así el motor entrega como final lo que tenía provisorio. Los `onresult` que lleguen hasta el `onend` se siguen entregando por `onFinalText`, y el botón ya muestra `idle`.
- `listening → idle` por `cancel()` (cambio de nota, app en segundo plano, desmontaje): se llama `recognition.abort()`, se descartan los resultados pendientes y se vacía `interimText`. Así no se escribe texto en otra nota.
- `listening → idle` por error fatal o guarda anti-bucle: se vacía `interimText`. Lo ya entregado como final queda en el draft (SC-004).

## Estado en `ActiveNoteView`

| Campo | Tipo | Descripción |
|---|---|---|
| `draft` | `string` | Contenido confirmado del campo de nueva idea (a mano y dictado final). Reemplaza al textarea no controlado actual. |

`value` mostrado = `composeDraft(draft, interimText)`.
