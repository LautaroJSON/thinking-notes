# Contrato: módulo de sonido y control de UI

Interfaz interna que usan los componentes. Los tipos están en [data-model.md](../data-model.md).

## `src/components/utils/sounds.ts` — preferencias (lógica pura, con tests)

```ts
export const SOUND_STORAGE_KEY = "sounds";
export type SoundCategoryId = "typing" | "selection" | "actions";
export type SoundId = "key" | "delete" | "enter" | "select" | "close"
  | "create" | "remove" | "copy" | "drop" | "paste"
  | "dictationStart" | "dictationStop";
export interface SoundPreferences { enabled: boolean; typing: boolean; selection: boolean; actions: boolean }

export const SOUND_CATEGORIES: readonly { id: SoundCategoryId; label: string }[];
export const SOUND_CATEGORY: Record<SoundId, SoundCategoryId>;

/** Defaults según el dispositivo (isTouch = puntero principal grueso). */
export function getDefaultSoundPreferences(isTouch: boolean): SoundPreferences;
/** Lee overrides de localStorage y los combina con los defaults. Nunca lanza. */
export function loadSoundPreferences(isTouch: boolean): SoundPreferences;
/** Guarda solo los overrides respecto de los defaults. Nunca lanza. */
export function saveSoundPreferences(prefs: SoundPreferences, isTouch: boolean): void;
/** ¿Debe sonar este sonido con estas preferencias? */
export function isSoundAllowed(id: SoundId, prefs: SoundPreferences): boolean;
/** Clasifica un InputEvent.inputType: sonido de escritura, pegado o nada. */
export function soundForInputType(inputType: string): SoundId | null;
```

## `src/components/utils/soundEngine.ts` — síntesis (efectos del navegador)

```ts
/** Prepara el AudioContext en el primer gesto del usuario. Idempotente. */
export function unlockAudio(): void;
/** Reproduce la receta si hay contexto y la pestaña está visible. Nunca lanza ni bloquea. */
export function playRecipe(id: SoundId): void;
```

Garantías: sin contexto o sin soporte → no hace nada; límite de 6 voces; `typing` limitado a 1 cada 35 ms.

## `src/hooks/useSounds.ts` — store compartido (con tests)

```ts
/** Para los componentes. `play` respeta preferencias, visibilidad y límites. */
export function useSounds(): {
  prefs: SoundPreferences;
  setEnabled(value: boolean): void;
  setCategory(id: SoundCategoryId, value: boolean): void; // al encender, suena una muestra
  play(id: SoundId): void;
};
/** Igual que play() pero sin hook, para notesContext y listeners globales. */
export function playSound(id: SoundId): void;
```

Patrón idéntico a `useTheme`: `useSyncExternalStore` + listener de `storage` entre pestañas.

## `src/hooks/useTypingSounds.ts`

Se monta una vez en `App`. Registra en `document`:

- `pointerdown`/`keydown` (captura, una vez) → `unlockAudio()`.
- `beforeinput` → si el destino es `input[type=text|search]` o `textarea` editable, `playSound(soundForInputType(e.inputType))`.

## Componente `SoundSelector` (`src/components/soundSelector/`)

| Aspecto | Contrato |
|---------|----------|
| Botón | `button.circular-button`, ícono `Volume2` (Lucide) o `VolumeX` si `!enabled` o todas las categorías apagadas. `aria-label="Sonidos"`, `aria-haspopup="menu"`, `aria-expanded`. |
| Menú | `role="menu"`, `aria-label="Sonidos"`. Ítems `role="menuitemcheckbox"` con `aria-checked`: "Sonidos" (general) y luego "Escritura", "Selección", "Acciones". Con el general apagado, las categorías se ven atenuadas pero siguen siendo editables. |
| Teclado | Mismo comportamiento que `ThemeSelector`: flechas, Home/End, Escape cierra y devuelve el foco, Tab cierra. Espacio/Enter alterna el ítem **sin cerrar** el menú. |
| Cierre | Clic/toque afuera, Escape o el botón. |
| Ubicación | `sidebar-footer` junto a `ThemeSelector` (`placement="top"`). La cápsula colapsada no cambia (research R12). |

## Puntos donde se llama `play`

| SoundId | Dónde |
|---------|-------|
| `noteOpen` / `noteClose` | `Sidebar.handleSecActiveNote` (abrir / cerrar la nota). |
| `select` | Apertura de `ThemeSelector`, `DownloadMenu`, `NoteInfo`, `SoundSelector`; `ThemeSelector.handleSelect`; interruptores. |
| `close` | Cierre sin elegir de esos menús. |
| `create` | `notesContext.addNote` (rama de éxito online/offline); `ActiveNoteView.handleNewThinking`. |
| `remove` | `notesContext.deleteNote` (rama de éxito); `ActiveNoteView.handleDeleteThinking`. |
| `copy` | `CopyButton` tras copiar con éxito; `DownloadMenu` tras generar el archivo. |
| `drop` | `Sidebar.handleDragEnd` cuando la posición cambió. |
| `paste` | `ActiveNoteView.handlePaste` cuando hay imágenes; `beforeinput` `insertFromPaste` para texto. |
| `dictationStart` / `dictationStop` | Al cambiar el estado de escucha de `useSpeechDictation` por acción del usuario. |
