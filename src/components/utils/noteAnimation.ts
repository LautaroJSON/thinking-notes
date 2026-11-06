// Animación con la que se abre y se cierra el panel de una nota. La
// preferencia se guarda en este navegador (localStorage), como el tema.

export const NOTE_ANIMATION_STORAGE_KEY = "noteAnimation";

export const NOTE_ANIMATION_IDS = ["card", "sink", "slide"] as const;

export type NoteAnimationId = (typeof NOTE_ANIMATION_IDS)[number];

export interface NoteAnimationOption {
  id: NoteAnimationId;
  label: string;
  description: string;
}

export const DEFAULT_NOTE_ANIMATION: NoteAnimationId = "card";

export const NOTE_ANIMATIONS: readonly NoteAnimationOption[] = [
  {
    id: "card",
    label: "Desde la tarjeta",
    description: "Sale de la nota y vuelve a ella, como una app",
  },
  {
    id: "sink",
    label: "Hundirse",
    description: "Se achica, se desenfoca y se desvanece",
  },
  {
    id: "slide",
    label: "Deslizar",
    description: "Sube al abrir y baja al cerrar, como una hoja",
  },
];

export const isNoteAnimationId = (value: unknown): value is NoteAnimationId =>
  typeof value === "string" &&
  (NOTE_ANIMATION_IDS as readonly string[]).includes(value);

export const loadNoteAnimation = (): NoteAnimationId => {
  try {
    const stored = localStorage.getItem(NOTE_ANIMATION_STORAGE_KEY);
    return isNoteAnimationId(stored) ? stored : DEFAULT_NOTE_ANIMATION;
  } catch {
    return DEFAULT_NOTE_ANIMATION;
  }
};

export const saveNoteAnimation = (id: NoteAnimationId) => {
  try {
    if (id === DEFAULT_NOTE_ANIMATION) {
      localStorage.removeItem(NOTE_ANIMATION_STORAGE_KEY);
    } else {
      localStorage.setItem(NOTE_ANIMATION_STORAGE_KEY, id);
    }
  } catch (error) {
    // Se usa igual; solo no se va a recordar al recargar
    console.error("Error guardando la animación en localStorage:", error);
  }
};
