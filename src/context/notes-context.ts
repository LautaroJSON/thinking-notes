import { createContext } from "react";
import type { INotes, IsLoggedType, WaitingResponseType } from "../types";

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
}

export const NotesContext = createContext<NotesContextType | undefined>(
  undefined,
);
