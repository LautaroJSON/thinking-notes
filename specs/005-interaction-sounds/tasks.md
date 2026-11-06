---
description: "Lista de tareas para los sonidos de interacción"
---

# Tareas: Sonidos de interacción

**Input**: Documentos de diseño en `specs/005-interaction-sounds/`

**Prerrequisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/sound-module.md](./contracts/sound-module.md), [quickstart.md](./quickstart.md)

**Tests**: se incluyen porque el principio III de la constitución exige tests de Vitest para toda lógica nueva o modificada (utilidades, hooks, contexto), en los dos modos. La UI se verifica a mano según [quickstart.md](./quickstart.md).

**Organización**: las tareas están agrupadas por historia de usuario de la spec:

- **US1 (P1)**: escuchar sonidos al escribir, seleccionar y hacer acciones.
- **US2 (P1)**: silenciar por categoría o todo junto.
- **US3 (P2)**: recordar la preferencia y aplicar el default por dispositivo.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: historia de la spec a la que pertenece (US1 a US3).

## Convenciones

- Todas las rutas son relativas a la raíz del repo (`src/…`).
- Tipos, ids, defaults y reglas están en [data-model.md](./data-model.md); firmas en [contracts/sound-module.md](./contracts/sound-module.md); recetas y límites en research R2, R5 y R6. Las tareas los referencian en vez de repetirlos.
- Patrones a imitar: `src/components/utils/theme.ts`, `src/hooks/useTheme.ts`, `src/components/themeSelector/`.

---

## Fase 1: Setup

**Propósito**: rama y tipos de plataforma.

- [X] T001 Crear la rama `feat/interaction-sounds` desde `main` actualizado
- [X] T002 [P] Crear `src/types/audio-session.d.ts` con la declaración mínima de `navigator.audioSession` (`type?: "auto" | "playback" | "ambient" | "transient" | "transient-solo" | "play-and-record"`), opcional en `Navigator`, sin `any` (research R9)

---

## Fase 2: Base (bloquea a todas las historias)

**Propósito**: tipos y reglas de sonido, motor de síntesis y store compartido en memoria.

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta terminar esta fase.

### Tests de la base

- [X] T003 [P] Escribir `src/components/utils/sounds.test.ts` (parte reglas): `getDefaultSoundPreferences(false)` → todo `true`; `getDefaultSoundPreferences(true)` → `typing: false` y el resto `true`; `isSoundAllowed` devuelve `false` con `enabled: false` o con la categoría del sonido apagada y `true` en el resto; `soundForInputType`: `insertText`/`insertReplacementText` → `key`, `deleteContentBackward`/`deleteContentForward`/`deleteWordBackward` → `delete`, `insertLineBreak`/`insertParagraph` → `enter`, `insertFromPaste`/`insertFromDrop` → `paste`, `insertCompositionText` y desconocidos → `null`. `SOUND_CATEGORY` asigna una categoría a cada `SoundId`
- [X] T004 [P] Escribir `src/components/utils/soundEngine.test.ts` con un `AudioContext` falso (osciladores, `createBuffer`, `createBiquadFilter`, `createGain` que registran llamadas): sin `AudioContext` en `window`, `unlockAudio` y `playRecipe` no lanzan; antes de `unlockAudio` no se crea nada; con `document.visibilityState = "hidden"` no se crean nodos; dos `playRecipe("key")` a menos de 35 ms crean una sola voz (timers falsos de Vitest con `performance.now` controlado); con 6 voces activas una séptima se descarta; si `navigator.audioSession` existe, `unlockAudio` le pone `type = "ambient"`; si un nodo lanza, `playRecipe` no propaga

### Implementación de la base

- [X] T005 Crear `src/components/utils/sounds.ts` con `SoundCategoryId`, `SoundId`, `SoundPreferences`, `SOUND_CATEGORIES` (labels "Escritura", "Selección", "Acciones"), `SOUND_CATEGORY`, `getDefaultSoundPreferences(isTouch)`, `isSoundAllowed(id, prefs)` y `soundForInputType(inputType)`, según data-model y contrato. Comentario de cabecera explicando que la preferencia vive en `localStorage` y no va a la API. Hace pasar T003
- [X] T006 Crear `src/components/utils/soundEngine.ts`: `AudioContext` perezoso creado en `unlockAudio()` (más `resume()` si está suspendido y `audioSession.type = "ambient"` si existe); ganancia maestra ~0.18; buffer de ruido blanco de 1 s creado una vez; las 12 recetas de research R2 como funciones `(ctx, out, t) => duración` con ataques de 2–5 ms y caída exponencial, con variación aleatoria de ±15 % en frecuencia y ganancia para `key`/`delete`; `playRecipe(id)` que sale si no hay contexto o la pestaña no está visible, aplica el limitador de 35 ms para `key`/`delete`/`enter` y el tope de 6 voces (contador que baja en `onended`), y envuelve todo en `try/catch`. Hace pasar T004
- [X] T007 Crear `src/hooks/useSounds.ts` (sin persistencia todavía): store de módulo con `prefs` inicializadas con `getDefaultSoundPreferences(isTouchDevice())`, donde `isTouchDevice` usa `window.matchMedia?.("(pointer: coarse)").matches ?? false` (research R8); `subscribe`/`notify` y `useSyncExternalStore` como en `useTheme.ts`; exporta `playSound(id)`, que llama a `playRecipe` solo si `isSoundAllowed(id, prefs)`, y el hook `useSounds()` que devuelve `{ prefs, play: playSound }`
- [X] T008 Escribir `src/hooks/useSounds.test.ts` (parte base): con `soundEngine` mockeado (`vi.mock`), `playSound` llama a `playRecipe` cuando está permitido y no lo llama con la categoría apagada; con `matchMedia` falso en `coarse`, el default de Escritura es `false`

**Checkpoint**: `npm test` pasa; el motor y el store existen pero nada los usa todavía.

---

## Fase 3: User Story 1 - Escuchar respuesta sonora al usar la app (Prioridad: P1) 🎯 MVP

**Objetivo**: la app suena al escribir, seleccionar y hacer acciones, sin retrasos ni sonidos ante fallas.

**Prueba independiente**: quickstart pasos 1–10 y 16–18: seleccionar, crear, agregar idea, borrar, escribir, pegar, dictar, copiar, descargar, reordenar y abrir menús, comprobando que cada acción suena una vez y que nada suena con la pestaña oculta ni ante fallas.

### Tests de US1

- [X] T009 [US1] Ampliar `src/context/notesContext.test.tsx` mockeando `@/hooks/useSounds` (`playSound`): crear nota offline y online exitosa → `playSound("create")` una vez; borrar nota offline y online exitosa → `playSound("remove")` una vez; con el servicio de crear/borrar rechazando → `playSound` no se llama; la carga inicial de notas (offline y online) no llama a `playSound`

### Implementación de US1

- [X] T010 [US1] Crear `src/hooks/useTypingSounds.ts`: un `useEffect` que registra en `document` (1) `pointerdown` y `keydown` con `{ capture: true }` que llaman a `unlockAudio()` (idempotente; se quitan después del primer gesto); (2) `beforeinput` que, si `e.target` es un `HTMLTextAreaElement` o un `HTMLInputElement` de tipo `text`/`search` no `readOnly`, ni `disabled`, calcula `soundForInputType(e.inputType)` y llama a `playSound` con el resultado si no es `null`. Limpia los listeners al desmontar (research R3, R5, R7)
- [X] T011 [US1] Montar `useTypingSounds()` una sola vez en `src/App.tsx`
- [X] T012 [US1] En `src/context/notesContext.tsx`, importar `playSound` y llamar `playSound("create")` en `addNote` justo después de `setActiveNoteState(newNote)` (online, dentro del `try`) y después de `setActiveNoteState(newNoteWithId)` (offline); llamar `playSound("remove")` en `deleteNote` después de `closeActiveNote()` en la rama online (dentro del `try`) y en la offline (research R11). Hace pasar T009
- [X] T013 [P] [US1] En `src/components/sidebar/index.tsx`: `play("select")` en `handleSecActiveNote` (al abrir y al cerrar la nota); `play("drop")` en `handleDragEnd` solo cuando `over` existe y `active.id !== over.id`
- [X] T014 [P] [US1] En `src/components/notes/noteContent/components/activeNoteView.tsx`: `play("create")` en `handleNewThinking` cuando la idea se agrega (no con texto vacío); `play("remove")` en `handleDeleteThinking`; `play("paste")` en `handlePaste` solo en la rama de imágenes; `play("dictationStart")`/`play("dictationStop")` cuando el usuario inicia o detiene el dictado (en los handlers de inicio/fin de escucha que ya llaman a `useSpeechDictation`, no en `handleFinalText`)
- [X] T015 [P] [US1] En `src/components/notes/noteContent/components/copyButton.tsx`: `play("copy")` solo después de que `handleCopy` termina con éxito
- [X] T016 [P] [US1] En `src/components/notes/noteContent/components/downloadMenu.tsx`: `play("select")` al abrir, `play("close")` al cerrar sin elegir (afuera o Escape) y `play("copy")` tras generar Markdown o PDF con éxito
- [X] T017 [P] [US1] En `src/components/notes/noteContent/components/noteInfo.tsx`: `play("select")` al abrir y `play("close")` al cerrar
- [X] T018 [P] [US1] En `src/components/themeSelector/index.tsx`: `play("select")` al abrir y en `handleSelect`; `play("close")` al cerrar sin elegir (afuera, Escape o botón)
- [X] T019 [US1] Ajuste a oído de las recetas en `src/components/utils/soundEngine.ts` con `npm run dev`: escuchar los 12 sonidos seguidos y escribir varios minutos; ajustar frecuencias, duraciones y ganancias hasta cumplir el carácter de la spec (ninguno estridente, escritura casi imperceptible, todos de la misma familia, ninguno > 500 ms)

**Checkpoint**: con todo encendido por defecto, la app suena en todos los eventos de la spec. MVP demostrable (sin control para silenciar todavía).

---

## Fase 4: User Story 2 - Silenciar los sonidos por categoría o todos juntos (Prioridad: P1)

**Objetivo**: menú de parlante con interruptor general y uno por categoría.

**Prueba independiente**: quickstart pasos 11, 12, 14 y 15.

### Tests de US2

- [X] T020 [US2] Ampliar `src/hooks/useSounds.test.ts`: `setCategory("typing", false)` notifica a los suscriptores y `playSound("key")` deja de llamar a `playRecipe` mientras `playSound("select")` sigue sonando; `setEnabled(false)` silencia todo; `setEnabled(true)` restaura exactamente las categorías previas; `setCategory(id, true)` con el general encendido reproduce una muestra (`typing` → `key`, `selection` → `select`, `actions` → `create`), y con el general apagado no

### Implementación de US2

- [X] T021 [US2] Agregar a `src/hooks/useSounds.ts` `setEnabled(value)` y `setCategory(id, value)` (actualizan `prefs` de forma inmutable, notifican y, al encender una categoría con el general encendido, reproducen su muestra), y exponerlos desde `useSounds()`. Hace pasar T020
- [X] T022 [P] [US2] Crear `src/components/soundSelector/index.tsx` según el contrato: botón `circular-button` con `Volume2`, o `VolumeX` si `!prefs.enabled` o las tres categorías están apagadas; `aria-label="Sonidos"`, `aria-haspopup="menu"`, `aria-expanded` y `aria-controls`; menú `role="menu"` con 4 ítems `role="menuitemcheckbox"` y `aria-checked` ("Sonidos" y luego las categorías de `SOUND_CATEGORIES`); navegación con flechas, Home/End, Escape y Tab copiada de `ThemeSelector`; Enter/Espacio alterna sin cerrar; cierre al tocar afuera; prop `placement: "top" | "right"`; categorías con clase atenuada cuando el general está apagado; `play("select")` al abrir y `play("close")` al cerrar
- [X] T023 [P] [US2] Crear `src/components/soundSelector/styles.css` reutilizando las variables de `src/themes.css` y el estilo de `src/components/themeSelector/styles.css` (menú hacia arriba/derecha, interruptor tipo switch, estado atenuado), verificado en los tres temas y a 360 px
- [X] T024 [US2] En `src/components/sidebar/index.tsx`, renderizar `<SoundSelector />` en `.sidebar-footer` junto a `<ThemeSelector />` (la cápsula colapsada no cambia, research R12 revisada); ajustar `src/components/sidebar/styles.css` para separar los botones

**Checkpoint**: el usuario puede silenciar cada categoría o todo; la elección se pierde al recargar (eso lo agrega US3).

---

## Fase 5: User Story 3 - La preferencia de sonido se recuerda (Prioridad: P2)

**Objetivo**: persistir solo lo que el usuario cambia, con defaults por dispositivo y sincronización entre pestañas.

**Prueba independiente**: quickstart pasos 13, 20 y 21.

### Tests de US3

- [X] T025 [P] [US3] Ampliar `src/components/utils/sounds.test.ts`: `loadSoundPreferences` sin clave → defaults (computadora y táctil); con `{"typing": true}` en táctil → `typing: true`; con JSON inválido, `null`, array, tipos no booleanos o claves desconocidas → los campos inválidos se ignoran; con `localStorage.getItem` que lanza → defaults. `saveSoundPreferences` guarda solo los campos que difieren del default del dispositivo, borra la clave si no queda ninguno y no lanza si `setItem` falla
- [X] T026 [P] [US3] Ampliar `src/hooks/useSounds.test.ts`: un cambio con `setCategory`/`setEnabled` llama a `saveSoundPreferences`; un `StorageEvent` con clave `"sounds"` recarga las preferencias y notifica; un `StorageEvent` con otra clave no hace nada

### Implementación de US3

- [X] T027 [US3] Agregar `SOUND_STORAGE_KEY`, `loadSoundPreferences(isTouch)` y `saveSoundPreferences(prefs, isTouch)` a `src/components/utils/sounds.ts` (lectura como `unknown` validada campo por campo; errores capturados, como en `theme.ts`; research R10). Hace pasar T025
- [X] T028 [US3] En `src/hooks/useSounds.ts`, inicializar `prefs` con `loadSoundPreferences(isTouchDevice())`, guardar con `saveSoundPreferences` en `setEnabled`/`setCategory`, y escuchar `storage` (clave `"sounds"`) en `subscribe`/desuscribir como en `useTheme.ts`. Hace pasar T026

**Checkpoint**: la configuración sobrevive recargas, inicio y cierre de sesión, con y sin conexión.

---

## Fase 6: Pulido y transversales

- [X] T029 [P] Correr `npm run lint` y dejar sin errores todos los archivos nuevos y tocados
- [X] T030 [P] Correr `npm test` y `npm run build`; confirmar que el bundle crece solo unos pocos KB respecto de `main`
- [ ] T031 Verificación manual completa de [quickstart.md](./quickstart.md) (pasos 1–23 y escucha de carácter) en escritorio y celular, con y sin sesión y sin conexión
- [X] T032 [P] Subir la versión minor en `package.json` (1.11.0 → 1.12.0) y mencionar los sonidos en la nota de versión si el proyecto la tiene

---

## Dependencias y orden de ejecución

### Entre fases

- **Setup (F1)** → **Base (F2)** → **US1 (F3)** → **US2 (F4)** → **US3 (F5)** → **Pulido (F6)**.
- US2 depende de que el store (T007) exista; puede empezar en paralelo con US1 una vez terminada la Base, porque toca archivos distintos (salvo `sidebar/index.tsx`: T013 antes que T024).
- US3 depende de T021 (setters) para enganchar el guardado.

### Dentro de cada historia

- Tests antes que la implementación que los hace pasar (T003/T004 → T005/T006, T009 → T012, T020 → T021, T025/T026 → T027/T028).
- T019 (ajuste a oído) al final de US1, cuando ya hay sonidos enganchados.

### Oportunidades de paralelismo

- F1: T002 en paralelo con T001.
- F2: T003 y T004 en paralelo; luego T005 y T006 en paralelo.
- US1: T013–T018 en paralelo (un archivo distinto cada una) después de T010–T012.
- US2: T022 y T023 en paralelo.
- US3: T025 y T026 en paralelo.

### Ejemplo de paralelismo (US1)

```text
Después de T012:
  T013 sidebar/index.tsx
  T014 activeNoteView.tsx
  T015 copyButton.tsx
  T016 downloadMenu.tsx
  T017 noteInfo.tsx
  T018 themeSelector/index.tsx
```

## Estrategia de implementación

1. **MVP (F1–F3)**: sonidos funcionando en toda la app con los defaults. Se puede probar y ajustar el carácter sonoro antes de construir el menú.
2. **US2**: menú de silencio. **Sumarlo antes de publicar**: la spec trata silenciar como P1, así que no se publica US1 sin US2.
3. **US3**: persistencia y default por dispositivo.
4. **Pulido**: lint, build, verificación manual completa y versión.
