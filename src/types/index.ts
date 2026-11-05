export interface INotes {
  id?: string;
  title: string;
  thinkings: string[];
  /** Fecha ISO de creación; ausente en notas locales anteriores a esta versión. */
  createdAt?: string;
  /** Fecha ISO de la última modificación del contenido (no cambia al reordenar). */
  updatedAt?: string;
}

export type IsLoggedType = "online" | "offline" | "loading";

export type WaitingResponseType =
  | "gettingNotes"
  | "creatingNote"
  | "deletingNote"
  | "editingNote"
  | "reorderingNotes"
  | "none";
