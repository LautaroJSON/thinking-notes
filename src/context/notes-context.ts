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
}

export const NotesContext = createContext<NotesContextType | undefined>(
  undefined,
);
