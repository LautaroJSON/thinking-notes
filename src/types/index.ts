import type { Thinking } from "./thinking";

export type {
  ImageRef,
  ImageThinking,
  TextThinking,
  Thinking,
  UnknownThinking,
} from "./thinking";

export interface INotes {
  id?: string;
  title: string;
  thinkings: Thinking[];
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
  | "uploadingImages"
  | "none";
