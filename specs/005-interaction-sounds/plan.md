# Implementation Plan: Sonidos de interacción

**Branch**: `005-interaction-sounds` (trabajo en `feat/interaction-sounds`) | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-interaction-sounds/spec.md`

## Summary

Agregar sonidos suaves y cortos, generados dentro de la app, para la escritura, la selección y las acciones, con un menú de parlante en el pie del panel lateral para silenciarlos por categoría o todos juntos. Los sonidos se sintetizan con la Web Audio API nativa: sin archivos de audio ni librerías nuevas. La escritura se detecta con un único listener global de `beforeinput`. La preferencia se guarda en `localStorage`, igual que el tema. Escritura arranca apagada en dispositivos táctiles. Ver [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript (strict) sobre React 19.

**Primary Dependencies**: React, Vite, Lucide (íconos `Volume2`/`VolumeX`). Web Audio API del navegador. **Sin dependencias nuevas.**

**Storage**: `localStorage`, clave `"sounds"` (solo overrides). Nada en la API ni en Supabase.

**Testing**: Vitest + Testing Library (jsdom), con `AudioContext` y `matchMedia` falsos.

**Target Platform**: PWA en navegadores modernos de escritorio y móviles (Chrome, Safari iOS 16+, Firefox, Edge).

**Project Type**: aplicación web de una sola página (frontend).

**Performance Goals**: el sonido no agrega latencia perceptible a la escritura (la síntesis por evento es < 1 ms de CPU); la carga de la app no cambia de forma perceptible (+ ~5 KB minificados estimados, `AudioContext` creado recién en el primer gesto).

**Constraints**: funciona sin conexión; nunca lanza ni bloquea; no suena antes del primer gesto, con la pestaña oculta ni por eventos que no inició el usuario; máximo 6 voces y 1 sonido de escritura cada 35 ms.

**Scale/Scope**: 12 recetas de sonido, 3 categorías, 1 componente nuevo, ~8 puntos de integración en componentes existentes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumple | Cómo |
|-----------|--------|------|
| I. Paridad Offline/Online | ✅ | La preferencia vive en `localStorage` con y sin sesión; los sonidos se sintetizan localmente, sin red. Crear/borrar suenan en la rama de éxito de **ambos** modos. Los tests cubren los dos modos en `notesContext`. |
| II. Experiencia Minimalista y Fluida | ✅ | Un único botón en el pie del panel, junto a la paleta; nada en el área de escritura. Sonidos cortos y suaves; audio que falla no rompe ni demora nada. Textos en español. Usable en celular (Escritura apagada por defecto en táctiles). |
| III. Tests para la Lógica | ✅ | Tests de preferencias (`sounds.ts`), store (`useSounds`), motor con `AudioContext` falso y llamadas en `notesContext`. La UI se verifica según [quickstart.md](./quickstart.md). |
| IV. TypeScript Estricto | ✅ | Tipos `SoundId`, `SoundCategoryId`, `SoundPreferences` declarados junto al módulo; lectura de `localStorage` como `unknown` validada campo por campo; `navigator.audioSession` tipado con un `.d.ts` mínimo, sin `any`. |
| V. Stack Estable | ✅ | Sin librerías nuevas; se descartaron Tone.js/Howler.js (ver research R1). |
| Restricciones: PWA | ✅ | No hay assets nuevos ni cambios en el service worker. |
| Flujo: rama, commits, gates | ✅ | Rama `feat/interaction-sounds`, Conventional Commits en español; `npm test`, `npm run build` y lint sin errores nuevos en los archivos tocados. |

**Resultado**: pasa sin excepciones. *Re-chequeo post-diseño (Fase 1): sin cambios; el diseño no agrega dependencias ni toca la capa de red.*

## Project Structure

### Documentation (this feature)

```text
specs/005-interaction-sounds/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── sound-module.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (no lo crea este comando)
```

### Source Code (repository root)

```text
src/
├── App.tsx                                  # monta useTypingSounds()
├── types/
│   └── audio-session.d.ts                   # NUEVO: tipo mínimo de navigator.audioSession
├── components/
│   ├── utils/
│   │   ├── sounds.ts                        # NUEVO: categorías, defaults, load/save, reglas
│   │   ├── sounds.test.ts                   # NUEVO
│   │   ├── soundEngine.ts                   # NUEVO: AudioContext + recetas + limitador
│   │   └── soundEngine.test.ts              # NUEVO
│   ├── soundSelector/
│   │   ├── index.tsx                        # NUEVO: botón parlante + menú de interruptores
│   │   └── styles.css                       # NUEVO (reusa variables de themes.css)
│   ├── sidebar/index.tsx                    # botón en pie y cápsula colapsada; select y drop
│   ├── themeSelector/index.tsx              # select/close
│   └── notes/noteContent/components/
│       ├── activeNoteView.tsx               # agregar/borrar idea, pegar imagen, dictado
│       ├── copyButton.tsx                   # copy
│       ├── downloadMenu.tsx                 # select/close, copy al descargar
│       └── noteInfo.tsx                     # select/close
├── context/
│   ├── notesContext.tsx                     # create/remove en rama de éxito
│   └── notesContext.test.tsx                # casos de sonido online/offline/error
└── hooks/
    ├── useSounds.ts                         # NUEVO: store compartido (patrón useTheme)
    ├── useSounds.test.ts                    # NUEVO
    └── useTypingSounds.ts                   # NUEVO: unlock + beforeinput global
```

**Structure Decision**: se sigue la estructura existente de un solo frontend. La lógica pura va en `src/components/utils/` (como `theme.ts`), el store en `src/hooks/` (como `useTheme.ts`) y el componente de UI en `src/components/soundSelector/` (espejo de `themeSelector`).

## Decisiones de diseño clave

1. **Síntesis nativa** (R1–R2): 12 recetas con osciladores y ruido filtrado; volumen maestro ~0.18.
2. **Escritura global** (R5–R6): `beforeinput` filtrado por `inputType`; el dictado no dispara el evento, así que no suena como escritura; 35 ms entre sonidos de escritura y 6 voces como máximo.
3. **Éxito antes del sonido** (R11): crear y borrar nota suenan dentro de `notesContext`, después de que la operación termina bien.
4. **Defaults por dispositivo** (R8, R10): `(pointer: coarse)` decide el default de Escritura; solo se persisten los cambios explícitos.
5. **Respeto del entorno** (R3, R4, R9): contexto de audio perezoso tras el primer gesto, silencio con la pestaña oculta y `audioSession.type = "ambient"` en iOS.
6. **Panel colapsado** (R12, revisada): el botón de sonido va solo en el pie del panel expandido, como la paleta de temas; la cápsula colapsada no cambia.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Los sonidos sintetizados suenan "electrónicos" | Ronda de ajuste a oído (quickstart, escucha de carácter); las recetas están aisladas en `soundEngine.ts` para iterar sin tocar el resto. |
| Usuarios actuales sorprendidos al escuchar sonidos de golpe | Elección explícita del usuario (todo encendido). Se puede anunciar en la nota de versión. |
| `beforeinput` con comportamiento distinto en algún teclado móvil | En táctiles Escritura arranca apagada; si alguien la activa y algo falla, el peor caso es que no suene. |

## Complexity Tracking

Sin violaciones de la constitución que justificar.
