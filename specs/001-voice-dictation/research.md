# Research: Dictado por voz en la nota

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-11-05

## R1. Motor de reconocimiento de voz

- **Decision**: usar la Web Speech API del navegador (`SpeechRecognition` / `webkitSpeechRecognition`), detectada en tiempo de ejecución. Sin librerías nuevas.
- **Rationale**: es gratis, no requiere backend ni claves, da resultados provisorios en tiempo real (`interimResults`) y no graba audio en la app (FR-013). Cumple el Principio V (stack existente). Está disponible en Chrome/Edge (escritorio y Android) y Safari (macOS/iOS 14.5+).
- **Alternatives considered**:
  - *API de transcripción externa (Whisper, Deepgram, etc.)*: necesita grabar audio, mandarlo a un servidor y manejar una clave secreta. Viola la regla de secretos del frontend y suma costo. Descartada.
  - *Reconocimiento local con un modelo WASM (Vosk, whisper.cpp)*: funcionaría offline, pero suma decenas de MB al bundle y a la caché de la PWA. Descartada por costo frente al beneficio.
  - *Librería envoltorio (`react-speech-recognition`)*: ahorra poco código, oculta el ciclo de reinicio que necesitamos controlar (R3) y es una dependencia más. Descartada.

## R2. Tipos de TypeScript

- **Decision**: declarar en `src/types/speech.ts` una interfaz mínima del reconocedor (`SpeechRecognitionLike`: `lang`, `continuous`, `interimResults`, `start`, `stop`, `abort`, `onresult`, `onerror`, `onend`, `onstart`) y del evento de error (`error: SpeechRecognitionErrorCode`). Reusar los tipos de resultados que ya trae `lib.dom` (`SpeechRecognitionResultList`, etc.).
- **Rationale**: `lib.dom.d.ts` (TS 5.9) incluye `SpeechRecognitionResult*` pero no el constructor `SpeechRecognition` ni el evento de error. Declararlos evita `any` (Principio IV). El constructor se obtiene con `window.SpeechRecognition ?? window.webkitSpeechRecognition` y se valida su existencia.
- **Alternatives considered**: `@types/dom-speech-recognition`. Funciona, pero es una dependencia más para unas 30 líneas de tipos. Descartada.

## R3. Toggle que sobrevive al silencio (clarificación Q1)

- **Decision**: configurar `continuous = true` e `interimResults = true`. Mientras la intención del usuario sea "escuchando" (`wantsListening`), un `onend` no pedido dispara un nuevo `start()` automáticamente. El error `no-speech` se ignora y se reinicia. Un error fatal (`not-allowed`, `service-not-allowed`, `audio-capture`, `network`, `language-not-supported`) apaga la intención y no reinicia.
- **Rationale**: Chrome corta la sesión tras unos segundos de silencio, o en cualquier caso después de un rato, aun con `continuous`. Reiniciar en `onend` es la forma estándar de lograr un toggle "siempre escuchando". Separar "intención" de "estado real del motor" permite que el botón nunca muestre "escuchando" en falso (FR-007).
- **Guarda anti-bucle**: si se producen más de 3 reinicios seguidos en menos de 2 segundos sin ningún resultado, se detiene y se avisa ("No se pudo mantener el dictado activo"). Así se evita un bucle cuando el navegador cierra la sesión enseguida.
- **Alternatives considered**: no reiniciar (opción C de la clarificación, descartada por el usuario); apagar tras 30 s de silencio (opción B, descartada).

## R4. Escritorio (toggle) vs. celular (mantener presionado)

- **Decision**: usar Pointer Events en el botón y decidir el modo por `event.pointerType` en cada interacción (FR-002/FR-003 y edge case de dispositivos híbridos):
  - `pointerType === "touch"` → modo **hold**: `pointerdown` inicia; `pointerup`, `pointercancel` y `pointerleave` detienen. No se usa `setPointerCapture`, para que deslizar el dedo fuera del botón dispare `pointerleave` (escenario US2-3).
  - `mouse`/`pen`, o activación por teclado (Enter/Espacio, que genera `click` sin `pointerdown`) → modo **toggle** vía `click`. El `click` sintético que sigue a un toque se ignora con un flag `lastPointerWasTouch`.
  - **Toque corto**: si entre `pointerdown` y `pointerup` pasan menos de 300 ms, se detiene y se muestra la pista "Mantené presionado para dictar" (US2-4).
- **Rationale**: `pointerType` refleja cómo interactúa el usuario en ese momento y no qué dispositivo es, que es justo lo que pide el supuesto de la spec. Media queries como `(pointer: coarse)` fallan en los híbridos.
- **Anti-menús del sistema (FR-014)**: el botón lleva en CSS `touch-action: none`, `user-select: none` y `-webkit-touch-callout: none`, y además `onContextMenu={e => e.preventDefault()}`.
- **Alternatives considered**: detectar por user agent o por ancho de pantalla. Son frágiles y la spec los descarta.

## R5. Cómo se escribe el texto en el campo de nueva idea

- **Decision**: convertir el textarea de nueva idea en **controlado** (`draft` en estado de `ActiveNoteView`). El hook de dictado no toca el DOM: expone `interimText` y llama a un callback `onFinalText(text)`. El componente:
  - muestra `value = composeDraft(draft, interimText)`;
  - en `onFinalText`, hace `setDraft(d => appendTranscript(d, text))`;
  - en `onChange` (el usuario tipea), toma `e.target.value` y le saca el sufijo provisorio con `stripInterim(value, interimText)` antes de guardarlo en `draft`, para que lo provisorio no quede duplicado cuando llegue el resultado final.
- Las funciones puras `appendTranscript(base, chunk)` (une con un espacio solo si hace falta y recorta espacios dobles), `composeDraft` y `stripInterim` van en `src/components/utils/dictation.ts`, con tests.
- **Rationale**: un campo controlado hace que el texto a mano y el dictado convivan sin pisarse (edge case), y deja la lógica en funciones puras fáciles de testear (Principio III). Hoy el textarea es no controlado y se limpia con `e.currentTarget.value = ""`; el cambio es chico.
- **Alternatives considered**: escribir directo en `textAreaRef.current.value`. Pierde la sincronía con lo que tipea el usuario y es difícil de testear. Descartada.

## R6. Enter durante el dictado

- **Decision**: al confirmar una idea mientras se escucha, se agrega `composeDraft(draft, interim)`, se vacían `draft` e `interim`, y el hook ejecuta `resetSegment()`: un `abort()` del motor (descarta resultados pendientes) seguido del reinicio automático de R3, si la intención sigue activa.
- **Rationale**: sin el `abort`, el resultado final del fragmento ya enviado volvería a aparecer en la idea nueva (duplicado).

## R7. Cortes automáticos (FR-011)

- **Decision**: el hook expone `cancel()` (hace `abort()` y descarta lo pendiente; distinto de `stop()`, que finaliza lo provisorio), y `ActiveNoteView` lo llama:
  - en un efecto que depende de `activeNoteState?.id` (cambio de nota; el componente no se remonta porque no tiene `key`);
  - en `document.visibilitychange` cuando queda `hidden`;
  - en el cleanup al desmontar (salir de la nota).
- En modo hold, `window.blur` llama a `stop()` (equivale a soltar el botón).

## R8. Idioma (clarificación Q3)

- **Decision**: `recognition.lang = "es-AR"`, fijo.
- **Rationale**: Chrome y Safari soportan `es-AR`. Si el motor responde `language-not-supported`, se trata como error fatal con el mensaje "El dictado no está disponible en este navegador".

## R9. Disponibilidad y botón oculto (clarificación Q4)

- **Decision**: `isSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition)`. Si es `false`, el botón no se renderiza.
- **Riesgo conocido, iOS PWA instalada**: en algunas versiones de iOS el constructor existe en modo standalone pero falla al iniciar (`service-not-allowed`). En ese caso no se puede ocultar de antemano, así que cae en el manejo de errores de FR-010 con el mensaje "El dictado no está disponible en este navegador". Se verifica a mano (quickstart, paso M8).
- **Firefox**: no expone la API, así que el botón queda oculto.

## R10. Mensajes de error y avisos

| Código / situación | Mensaje (es) | ¿Fatal? |
|---|---|---|
| `not-allowed` | "Habilitá el permiso del micrófono para dictar." | Sí |
| `service-not-allowed`, `language-not-supported` | "El dictado no está disponible en este navegador." | Sí |
| `audio-capture` | "No se encontró un micrófono." | Sí |
| `network` | "El dictado necesita conexión a internet." | Sí |
| `no-speech` | — (se ignora; en toggle se reinicia) | No |
| `aborted` | — (provocado por nosotros) | No |
| Bucle de reinicios (R3) | "No se pudo mantener el dictado activo." | Sí |
| Toque corto (R4) | "Mantené presionado para dictar." (pista) | — |

- **Presentación**: un mensaje en línea, chico, debajo del campo de nueva idea, con `role="status"` y `aria-live="polite"`. Se oculta solo a los 4 s o al volver a dictar. No hay sistema de toasts en el proyecto y no hace falta crear uno (Principio II).

## R11. Permisos, HTTPS y PWA

- GitHub Pages sirve por HTTPS, así que el navegador puede pedir el micrófono. En `localhost`, el dev server también es un contexto seguro.
- No hace falta tocar el manifest ni el service worker; la PWA no se ve afectada.
- El audio lo procesa el navegador (en Chrome, en servidores de Google). La app no graba ni guarda audio (FR-013). Se documenta en la spec, en Assumptions.
