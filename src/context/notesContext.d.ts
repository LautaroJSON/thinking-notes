import { type ReactNode } from "react";
import type { INotes } from "../types";
interface NotesContextType {
    notes: INotes[];
    setNotes: (notes: INotes[]) => void;
    addNote: () => void;
    deleteNote: (index: number) => void;
    activeNoteID: number | null;
    setActiveNote: (id: number) => void;
    getActiveNote: () => INotes | null;
    closeNote: () => void;
    loadingSaveLocalStorage: boolean;
    isLogged: boolean;
}
export declare const NotesContext: import("react").Context<NotesContextType | undefined>;
export declare const NotesProvider: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare function useNotes(): NotesContextType;
export {};
