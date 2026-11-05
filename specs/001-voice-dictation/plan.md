# Implementation Plan: Dictado por voz en la nota

**Branch**: `001-voice-dictation` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-voice-dictation/spec.md`

## Summary

Agregar un botón de micrófono junto al campo de nueva idea de `ActiveNoteView`, que dicta en español rioplatense con resultados en tiempo real. En escritorio funciona como toggle y sigue escuchando a través del silencio, reiniciando el reconocimiento de forma transparente. En táctil dicta mientras se mantiene presionado. Se usa la Web Speech API nativa del navegador, sin dependencias nuevas. Toda la lógica vive en un hook testeable (`useSpeechDictation`) más funciones puras de composición de texto. El textarea de nueva idea pasa a ser controlado, para que el texto a mano y el dictado convivan. El botón se oculta si el navegador no soporta dictado. Ver [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (`strict`), React 19

**Primary Dependencies**: React, Vite 7, lucide-react (icono `Mic`); Web Speech API del navegador. **Sin dependencias nuevas.**

**Storage**: N/A. No se persiste nada nuevo; la idea confirmada sigue el guardado existente (localStorage / API remota).

**Testing**: Vitest + @testing-library/react (`renderHook`) en jsdom, con un `SpeechRecognition` falso inyectado.

**Target Platform**: PWA en navegadores modernos: Chrome/Edge escritorio y Android, Safari macOS/iOS 14.5+. En Firefox el botón se oculta.

**Project Type**: Aplicación web (SPA/PWA de un solo proyecto).

**Performance Goals**: Primeras palabras visibles en menos de 2 s (SC-002); sin trabajo extra en el render fuera del dictado.

**Constraints**: Contexto seguro (HTTPS/localhost) para el micrófono; reconocimiento sujeto a la red según el navegador; `base: "/thinking-notes/"` no se ve afectado.

**Scale/Scope**: 1 hook nuevo, 1 componente nuevo, 1 módulo de utilidades, 1 archivo de tipos y la modificación de `ActiveNoteView` y sus estilos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Evaluación | Estado |
|---|---|---|
| I. Paridad Offline/Online | El dictado no depende de la sesión: solo produce texto para el campo, y la idea confirmada se guarda por el camino de cada modo (FR-012). Si el reconocimiento necesita red y no hay, se avisa y escribir a mano sigue igual. La verificación manual se hace en ambos modos (quickstart). | ✅ |
| II. Minimalista y fluida | Un único botón; se oculta si no hay soporte; los mensajes son en línea y se cierran solos; sin confirmaciones; el pulso es sutil; funciona en celular; los textos están en español. Los errores son visibles (R10) y nunca silenciosos. | ✅ |
| III. Tests para la lógica | `useSpeechDictation` (C1–C13) y las utilidades (U1–U10) con Vitest; el componente se verifica a mano (M1–M18). | ✅ |
| IV. TypeScript estricto | Tipos propios en `src/types/speech.ts` para lo que falta en `lib.dom`; sin `any`; constructor validado en tiempo de ejecución. | ✅ |
| V. Stack estable | Solo API nativa + lucide. Se descartaron `react-speech-recognition`, `@types/dom-speech-recognition` y motores externos (R1, R2). | ✅ |
| Restricciones técnicas | Sin `fetch` en componentes (no hay red propia); sin secretos; PWA y manifest sin cambios; GitHub Pages ya es HTTPS. | ✅ |
| Flujo | Rama `feat/...` (ver nota), Conventional Commits en español, gates build/test/lint. | ⚠️ Nota |

**Nota de flujo**: la rama actual se llama `001-voice-dictation` (la creó Spec Kit). La constitución pide `feat/...`. Recomendación: renombrar a `feat/voice-dictation` antes de abrir el PR. No es una violación de diseño.

**Re-check post-diseño (Phase 1)**: los contratos y el data model mantienen todo en memoria, sin persistencia nueva ni dependencias. Sin violaciones; la tabla de Complexity Tracking queda vacía.

## Project Structure

### Documentation (this feature)

```text
specs/001-voice-dictation/
├── plan.md              # Este archivo
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── use-speech-dictation.md   # Hook + utilidades (C1–C13, U1–U10)
│   └── dictation-button-ui.md    # Botón e integración en ActiveNoteView
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── types/
│   └── speech.ts                         # NUEVO: SpeechRecognitionLike, error codes, DictationMessage
├── hooks/
│   ├── useSpeechDictation.ts             # NUEVO: ciclo de vida, reinicio, errores, modos
│   └── useSpeechDictation.test.ts        # NUEVO: C1–C13 con reconocedor falso
├── components/
│   ├── utils/
│   │   ├── dictation.ts                  # NUEVO: appendTranscript, composeDraft, stripInterim
│   │   └── dictation.test.ts             # NUEVO: U1–U10
│   └── notes/noteContent/
│       ├── components/
│       │   ├── dictationButton.tsx       # NUEVO: toggle vs hold por pointerType
│       │   └── activeNoteView.tsx        # MODIFICADO: textarea controlado + integración
│       └── styles.css                    # MODIFICADO: botón, estado activo, mensaje
```

**Structure Decision**: un solo proyecto web; se respetan las carpetas existentes (`src/hooks`, `src/components/utils`, `src/types`, componentes por carpeta con `styles.css`). No se crea `src/services`, porque no hay llamadas de red propias.

## Complexity Tracking

Sin violaciones a la constitución que justificar.
