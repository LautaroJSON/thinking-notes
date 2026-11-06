import { createContext } from "react";
import type {
  ImageRef,
  INotes,
  IsLoggedType,
  WaitingResponseType,
} from "../types";

export interface NotesContextType {
  notes: INotes[];
  addNote: () => void;
  setNotes: (notes: INotes[]) => void;
  deleteNote: (id: string) => void;
  activeNoteState: INotes | null;
  setActiveNote: (id: string) => void;
  getActiveNote: () => INotes | null;
  updateActiveNote: (updates: Partial<INotes>) => void;
  closeActiveNote: () => void;
  loadingSaveNote: boolean;
  setLoadingSaveNote: (value: boolean) => void;
  isLogged: IsLoggedType;
  saveUpdatesNotesOnDBorLocalStorage: () => void;
  waitingResponse: WaitingResponseType;
  /** Mueve la nota `activeId` a la posición de `overId` y guarda el orden. */
  reorderNotes: (activeId: string, overId: string) => Promise<void>;
  /** Error del último guardado de orden fallido; `null` si no hay. */
  reorderError: string | null;
  clearReorderError: () => void;
  /**
   * Guarda las imágenes y agrega a la nota activa un pensamiento con ellas y
   * el texto. Devuelve false si no se agregó (se cambió de nota durante la
   * subida). Rechaza con un ImageStoreError (mensaje listo para mostrar).
   */
  addImageThinking: (blobs: Blob[], text: string) => Promise<boolean>;
  /** Quita imágenes y/o cambia el texto de un pensamiento con imágenes. */
  editImageThinking: (
    thinkingId: string,
    changes: { removedRefs: ImageRef[]; text: string },
  ) => void;
  /** Borra un pensamiento de la nota activa (y sus imágenes). */
  removeThinking: (thinkingId: string) => void;
}

export const NotesContext = createContext<NotesContextType | undefined>(
  undefined,
);
