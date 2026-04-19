import { type ReactNode } from "react";
import type { INotes } from "../types";
interface NotesContextType {
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
    isLogged: boolean;
    saveUpdatesNotesOnDBorLocalStorage: () => void;
}
export declare const NotesContext: import("react").Context<NotesContextType | undefined>;
export declare const NotesProvider: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare function useNotes(): NotesContextType;
export {};
