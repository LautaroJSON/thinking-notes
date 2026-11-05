---

description: "Lista de tareas para implementar el dictado por voz en la nota"
---

# Tasks: Dictado por voz en la nota

**Input**: Documentos de diseño en `specs/001-voice-dictation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: SÍ se incluyen. La constitución (Principio III) exige tests de Vitest para la lógica nueva (hooks y utilidades). Los componentes visuales se verifican a mano con los pasos de [quickstart.md](./quickstart.md).

**Organización**: las tareas se agrupan por historia de usuario para poder implementarlas y probarlas por separado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (otro archivo, sin depender de tareas incompletas)
- **[Story]**: historia de usuario de la tarea (US1, US2, US3)
- Referencias: `C#` = comportamientos de [contracts/use-speech-dictation.md](./contracts/use-speech-dictation.md); `U#` = casos de utilidades del mismo contrato; `M#` = pasos manuales de [quickstart.md](./quickstart.md); `R#` = decisiones de [research.md](./research.md).

## Path Conventions

Un solo proyecto web: código en `src/`, tests junto al archivo (`*.test.ts`), alias `@/` → `src/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dejar la rama según la convención del proyecto.

- [X] T001 Renombrar la rama `001-voice-dictation` a `feat/voice-dictation` (`git branch -m feat/voice-dictation`) — *hecho: la rama no existía (se estaba en `main`), así que se creó `feat/voice-dictation` con `git switch -c`*, como pide la constitución (Flujo de Desarrollo). No requiere cambios de código ni dependencias nuevas.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tipos y utilidades puras que usan todas las historias.

**⚠️ CRITICAL**: ninguna historia puede empezar hasta terminar esta fase.

- [X] T002 [P] Crear `src/types/speech.ts` con: `SpeechRecognitionLike` (`lang`, `continuous`, `interimResults`, `start()`, `stop()`, `abort()`, `onstart`, `onresult: (e: SpeechRecognitionEventLike) => void`, `onerror: (e: SpeechRecognitionErrorEventLike) => void`, `onend`), `SpeechRecognitionEventLike` (`resultIndex: number`, `results: SpeechRecognitionResultList` de `lib.dom`), `SpeechRecognitionErrorCode` (union: `"no-speech" | "aborted" | "audio-capture" | "network" | "not-allowed" | "service-not-allowed" | "language-not-supported" | "bad-grammar"`), `SpeechRecognitionErrorEventLike` (`error: SpeechRecognitionErrorCode`), `SpeechRecognitionConstructor` (`new () => SpeechRecognitionLike`), `DictationMode`, `DictationStatus`, `DictationMessage` (según [data-model.md](./data-model.md)), y una función `getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null` que lea `window.SpeechRecognition ?? window.webkitSpeechRecognition` sin `any` (usar `window as Window & { SpeechRecognition?: ...; webkitSpeechRecognition?: ... }`). Si el proyecto no exporta desde `src/types/index.ts`, re-exportar desde ahí.
- [X] T003 [P] Escribir `src/components/utils/dictation.test.ts` con los casos U1–U10 del contrato para `appendTranscript`, `composeDraft` y `stripInterim` (deben fallar antes de T004).
- [X] T004 Implementar `src/components/utils/dictation.ts`: `appendTranscript(base, chunk)` (trim de chunk; si está vacío devuelve base; si base está vacío o termina en espacio/salto de línea, concatena sin espacio extra, si no con un espacio; sin espacios dobles), `composeDraft(draft, interim)` (misma regla con el provisorio) y `stripInterim(value, interim)` (si `interim` no está vacío y `value` termina en `composeDraft("", interim)`, lo quita junto con el separador; si no, devuelve `value`). Hacer pasar T003.
- [X] T005 [P] Crear un reconocedor falso para tests en `src/hooks/test-utils/fakeSpeechRecognition.ts`: una clase que implementa `SpeechRecognitionLike`, registra las llamadas a `start/stop/abort` y expone helpers `emitResult([{ transcript, isFinal }])`, `emitError(code)`, `emitEnd()`, más una factoría `createFakeFactory()` que devuelve `{ factory, instances }` para inyectar como `recognitionFactory`. Construir `SpeechRecognitionResultList` falsos con objetos tipados (sin `any`).

**Checkpoint**: tipos, utilidades testeadas y reconocedor falso listos.

---

## Phase 3: User Story 1 - Dictar una idea en escritorio con un botón toggle (Priority: P1) 🎯 MVP

**Goal**: en escritorio, un clic en el micrófono empieza a dictar en el campo de nueva idea, sigue escuchando a través del silencio y otro clic lo detiene. El texto queda editable y se confirma con Enter.

**Independent Test**: en Chrome de escritorio, abrir una nota, clic en el micrófono, hablar (con pausas), clic de nuevo, Enter → la idea se agrega y se guarda (M1–M7).

### Tests for User Story 1 ⚠️

> Escribir primero y comprobar que fallan.

- [X] T006 [US1] Escribir `src/hooks/useSpeechDictation.test.ts` con `renderHook` y el reconocedor falso de T005, cubriendo: C1 (sin soporte → `isSupported=false` y `start` no hace nada), C2 (configuración `lang="es-AR"`, `continuous`, `interimResults`; `status="listening"`, `mode="toggle"`), C3 (provisorios → `interimText`), C4 (final → `onFinalText` una vez, con trim, y `interimText` vacío), C5 (`onend` no pedido y error `no-speech` → se reinicia con `start()` y `status` sigue en `listening`), C7 (`stop()` → `recognition.stop()`, `status="idle"`, los finales previos al `onend` se siguen entregando), C8 (`cancel()` → `abort()`, `interimText=""`, no entrega más finales), C9 (`resetSegment()` → abort + reinicio, descarta resultados del fragmento abortado), C11 (error `aborted` propio se ignora), C12 (desmontaje → abort, sin reinicio).

### Implementation for User Story 1

- [X] T007 [US1] Implementar `src/hooks/useSpeechDictation.ts` según el contrato: opciones `onFinalText`, `lang="es-AR"` y `recognitionFactory` (por defecto, usar `getSpeechRecognitionConstructor` de T002); estado `status`, `mode`, `interimText`; refs `wantsListening`, la instancia actual y un `sessionId` para ignorar eventos de instancias abortadas (C8, C9); `onFinalText` guardado en una ref para no recrear el reconocedor; `start(mode)`, `stop()`, `cancel()`, `resetSegment()`; reinicio en `onend` mientras `wantsListening` (R3); en `onresult`, recorrer desde `resultIndex`, separar finales y provisorios; cleanup al desmontar = `cancel`. En esta historia, cualquier error que no sea `no-speech` ni `aborted` pone `wantsListening=false` y `status="idle"`, sin mensaje (los mensajes llegan en US3). Exponer también `message: null`, `showHint` y `clearMessage` como no-ops tipados, para que la interfaz quede estable. Hacer pasar T006.
- [X] T008 [P] [US1] Crear `src/components/notes/noteContent/components/dictationButton.tsx` con las props del contrato de UI ([dictation-button-ui.md](./contracts/dictation-button-ui.md)): `<button type="button" className="action-btn dictation-btn">` con icono `Mic` de `lucide-react` (size 18), `aria-label="Dictar por voz"`, `title="Dictar por voz"`, `aria-pressed={status === "listening"}`, clase `is-listening` cuando escucha, `onClick → onToggle` y `onMouseDown={e => e.preventDefault()}` para no robarle el foco al textarea. Dejar `onHoldStart`/`onHoldEnd` en la interfaz; el cableado táctil va en T015.
- [X] T009 [P] [US1] Agregar estilos en `src/components/notes/noteContent/styles.css`: un contenedor `.new-thinking-wrapper` (`position: relative`) para el textarea; `.dictation-btn` posicionado abajo a la derecha dentro del wrapper; dejar `padding-right` en `.thinking-input` del wrapper para que el texto no quede debajo del botón; estado `.dictation-btn.is-listening` con color `var(--primary-color)` y un pulso sutil (`@keyframes dictationPulse`, `box-shadow`, sin bloquear la interacción) y `@media (prefers-reduced-motion: reduce)` sin animación.
- [X] T010 [US1] Modificar `src/components/notes/noteContent/components/activeNoteView.tsx`: (a) `const [draft, setDraft] = useState("")` y textarea de nueva idea **controlado** con `value={composeDraft(draft, interimText)}` y `onChange={e => setDraft(stripInterim(e.target.value, interimText))}`; (b) usar `useSpeechDictation({ onFinalText: text => setDraft(d => appendTranscript(d, text)) })`; (c) Enter sin Shift → `const text = composeDraft(draft, interimText).trim()`, si no está vacío `handleNewThinking(text)`, `setDraft("")`, y si `status === "listening"` llamar a `resetSegment()` (R6), conservando el comportamiento actual de Shift+Enter; (d) envolver el textarea en `.new-thinking-wrapper` y renderizar `<DictationButton>` solo si `isSupported`, con `onToggle` = `status === "listening" ? stop() : start("toggle")`; (e) placeholder "Escuchando…" si `status === "listening"` y `draft` está vacío. No tocar el textarea de edición de ideas ni el buscador.
- [X] T011 [US1] En `src/components/notes/noteContent/components/activeNoteView.tsx`, agregar los cortes automáticos (FR-011, R7): `useEffect` que llama a `cancel()` cuando cambia `activeNoteState?.id` (incluir `cancel` en dependencias, estable con `useCallback` en el hook); y listener de `document` `visibilitychange` que llama a `cancel()` si `document.hidden`, con su cleanup.
- [ ] T012 [US1] Verificación manual en Chrome de escritorio, **sin sesión y con sesión**: pasos M1, M2, M3, M4, M5, M6, M7, M14, M15 y M18 de [quickstart.md](./quickstart.md). Anotar resultados en el PR.

**Checkpoint**: MVP funcional en escritorio. Se puede demostrar sin US2 ni US3.

---

## Phase 4: User Story 2 - Dictar manteniendo presionado en celular (Priority: P2)

**Goal**: en dispositivos táctiles, dicta mientras se mantiene presionado el botón y se detiene al soltar, deslizar fuera o cancelar el gesto. Un toque corto muestra una pista.

**Independent Test**: en Chrome Android, mantener presionado, hablar y soltar → el texto queda en el campo; un toque corto muestra "Mantené presionado para dictar" (M9–M12).

### Tests for User Story 2 ⚠️

- [X] T013 [US2] Agregar casos a `src/hooks/useSpeechDictation.test.ts`: `start("hold")` deja `mode="hold"`; en modo hold, `stop()` entrega los finales pendientes (C7); `showHint("short-tap")` deja `message = { kind: "hint", code: "short-tap", text: "Mantené presionado para dictar." }`; `clearMessage()` lo limpia.

### Implementation for User Story 2

- [X] T014 [US2] En `src/hooks/useSpeechDictation.ts`, implementar el estado `message` real con `showHint("short-tap")` y `clearMessage()` (reemplazando los no-ops de T007), y que `start()` limpie `message`. Hacer pasar T013.
- [X] T015 [US2] En `src/components/notes/noteContent/components/dictationButton.tsx`, cablear Pointer Events (R4): `onPointerDown` con `pointerType === "touch"` → `preventDefault()`, guardar `performance.now()` y marcar `lastPointerWasTouch`, `onHoldStart()`; `onPointerUp`, `onPointerCancel` y `onPointerLeave` (solo si hay un hold activo) → `onHoldEnd(duración)`; en `onClick`, si `lastPointerWasTouch`, resetear el flag e ignorar (no llamar a `onToggle`); `onContextMenu={e => e.preventDefault()}`. No usar `setPointerCapture`.
- [X] T016 [P] [US2] En `src/components/notes/noteContent/styles.css`, agregar a `.dictation-btn`: `touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;` y un área táctil de al menos 40×40 px en `@media (pointer: coarse)` (FR-014).
- [X] T017 [US2] En `src/components/notes/noteContent/components/activeNoteView.tsx`: `onHoldStart={() => start("hold")}`; `onHoldEnd={ms => { stop(); if (ms < 300) showHint("short-tap"); }}`; agregar un listener de `window` `blur` que llama a `stop()` mientras `mode === "hold"` (R7); renderizar el mensaje como `<p className="dictation-message" role="status" aria-live="polite">{message.text}</p>` debajo del wrapper cuando hay `message`.
- [ ] T018 [US2] Verificación manual en Android Chrome (y con DevTools en modo táctil), **sin sesión y con sesión**: pasos M9, M10, M11 y M12 de [quickstart.md](./quickstart.md). Confirmar además que en escritorio el toggle sigue funcionando (M1, M3).

**Checkpoint**: US1 y US2 funcionan cada una por su lado; los dispositivos híbridos usan el modo según el tipo de interacción.

---

## Phase 5: User Story 3 - Avisos cuando el dictado no está disponible o falla (Priority: P3)

**Goal**: errores claros en español, sin perder texto, con el botón siempre en un estado coherente; la guarda anti-bucle evita reinicios infinitos.

**Independent Test**: denegar el permiso del micrófono → aparece el mensaje y el botón vuelve a inactivo; en Firefox no hay botón; offline → aviso de conexión (M8, M13, M16, M17).

### Tests for User Story 3 ⚠️

- [X] T019 [US3] Agregar casos a `src/hooks/useSpeechDictation.test.ts`: C10 (cada error fatal de la tabla R10 → `status="idle"`, sin reinicio, `message.kind="error"` con el texto exacto en español), C6 (con `vi.useFakeTimers`, 4 `onend` seguidos en menos de 2 s sin resultados → `status="idle"`, `message.code="restart-loop"`; y que un resultado en el medio reinicia el contador), C13 (el mensaje se limpia solo a los 4 s y al llamar a `start`), y que lo ya entregado por `onFinalText` antes del error no se pierde (SC-004).

### Implementation for User Story 3

- [X] T020 [US3] En `src/hooks/useSpeechDictation.ts`: mapa `ERROR_MESSAGES` de R10 (`not-allowed` → "Habilitá el permiso del micrófono para dictar."; `service-not-allowed` y `language-not-supported` → "El dictado no está disponible en este navegador."; `audio-capture` → "No se encontró un micrófono."; `network` → "El dictado necesita conexión a internet."; restart-loop → "No se pudo mantener el dictado activo."); errores fatales → `wantsListening=false`, `status="idle"`, `interimText=""`, `message`; capturar excepciones de `recognition.start()` (por ejemplo `InvalidStateError` o el fallo en iOS PWA) como `service-not-allowed`; guarda anti-bucle con `restartLog` (más de 3 reinicios en menos de 2 s sin resultados); timer de 4 s que limpia `message`, cancelado al desmontar. Hacer pasar T019.
- [X] T021 [P] [US3] En `src/components/notes/noteContent/styles.css`, estilo `.dictation-message`: texto chico (`0.85rem`), color neutro (`#64748b`) para `hint` y rojo suave (`#dc2626`) para `error` mediante un modificador `.dictation-message.is-error`, margen superior chico y aparición con un fade sutil. En `activeNoteView.tsx`, agregar la clase `is-error` cuando `message.kind === "error"`.
- [ ] T022 [US3] Verificación manual, **sin sesión y con sesión**: M8 (iOS Safari y PWA instalada), M13 (permiso denegado), M16 (offline en DevTools: aviso y escritura manual + guardado funcionando) y M17 (Firefox sin botón), de [quickstart.md](./quickstart.md).

**Checkpoint**: las tres historias funcionan y todos los errores terminan en un estado coherente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 [P] Actualizar `README.md`: agregar "Dictado por voz (toggle en escritorio, mantener presionado en celular; Chrome/Edge/Safari)" a la lista de funcionalidades.
- [X] T024 Ejecutar los gates: `npm test`, `npm run build` y `npm run lint`. Los archivos nuevos y `activeNoteView.tsx` / `styles.css` deben quedar sin errores de lint, y no se deben sumar errores respecto de `main`.
- [X] T025 Revisar que no haya `any`, `console.log` de depuración ni texto en inglés visible en `src/hooks/useSpeechDictation.ts`, `src/components/utils/dictation.ts`, `src/types/speech.ts` y `src/components/notes/noteContent/components/dictationButton.tsx`.
- [ ] T026 Pasada completa de [quickstart.md](./quickstart.md) (M1–M18) en ambos modos, sobre el build de `npm run preview`, y adjuntar el resultado al PR. Commits en Conventional Commits en español (por ejemplo `feat: agregar dictado por voz en la nota`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: T004 depende de T003; T002, T003 y T005 son independientes entre sí. Bloquea todas las historias.
- **US1 (Phase 3)**: depende de la fase 2.
- **US2 (Phase 4)**: depende de US1 (T007, T008, T010), porque extiende el mismo hook, botón y vista.
- **US3 (Phase 5)**: depende de US1 (T007, T010) y de T014 (estado `message`) y T017 (render del mensaje) de US2.
- **Polish (Phase 6)**: después de las historias que se quieran entregar.

### Within Each User Story

- Los tests (T006, T013, T019) se escriben primero y deben fallar.
- Hook → botón → integración en `ActiveNoteView` → verificación manual.
- `useSpeechDictation.ts`, `useSpeechDictation.test.ts`, `activeNoteView.tsx` y `styles.css` se tocan en varias historias: esas tareas son secuenciales entre historias.

### Parallel Opportunities

- Fase 2: T002, T003 y T005 en paralelo.
- US1: T008 (botón) y T009 (CSS) en paralelo con T006/T007 (hook).
- US2: T016 (CSS) en paralelo con T013–T015.
- US3: T021 (CSS) en paralelo con T019/T020.
- Polish: T023 en paralelo con el resto.

---

## Parallel Example: User Story 1

```bash
# Con la fase 2 terminada, en paralelo:
Task: "T006 Tests C1–C5, C7–C9, C11, C12 en src/hooks/useSpeechDictation.test.ts"
Task: "T008 DictationButton (toggle) en src/components/notes/noteContent/components/dictationButton.tsx"
Task: "T009 Estilos del botón y estado activo en src/components/notes/noteContent/styles.css"
# Después: T007 (hook) → T010 → T011 → T012
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fase 1 + fase 2.
2. Fase 3 (US1): toggle en escritorio.
3. **Validar** con T012 (M1–M7, M14, M15, M18) en ambos modos.
4. Se puede mergear: en celular el botón también funciona como toggle (un toque = click) hasta que llegue US2. Los errores apagan el dictado sin mensaje hasta US3.

### Incremental Delivery

1. Setup + Foundational → base testeada.
2. US1 → MVP en escritorio.
3. US2 → mantener presionado en celular.
4. US3 → mensajes de error y guarda anti-bucle.
5. Polish → gates, README y pasada completa del quickstart.

---

## Notes

- **[P]** = otro archivo y sin dependencias pendientes.
- Hacer commit por tarea o por grupo lógico, con Conventional Commits en español.
- No agregar dependencias: todo usa la API nativa y `lucide-react` (Principio V).
