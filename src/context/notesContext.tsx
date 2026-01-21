import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
} from "react";
import type { INotes } from "../types";

const STORAGE_KEY = "notes";

// Cargar notas desde localStorage o usar las predeterminadas
const loadNotesFromStorage = (): INotes[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored
      ? JSON.parse(stored)
      : [
          {
            title: "Welcome to Thinking Notes!",
            thinkings: [
              "This is your first note. You can edit the title and add your thoughts here.",
              "Your notes will be saved automatically in local storage.",
              "Feel free to add, delete, and manage your notes as you like.",
            ],
          },
        ];
  } catch (error) {
    console.error("Error cargando notas desde localStorage:", error);
    return [
      {
        title: "Welcome to Thinking Notes!",
        thinkings: [
          "This is your first note. You can edit the title and add your thoughts here.",
          "Your notes will be saved automatically in local storage.",
          "Feel free to add, delete, and manage your notes as you like.",
        ],
      },
    ];
  }
};

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
}

export const NotesContext = createContext<NotesContextType | undefined>(
  undefined,
);

export const NotesProvider = ({ children }: { children: ReactNode }) => {
  const [notes, setNotes] = useState<INotes[]>(loadNotesFromStorage());
  const [activeNoteID, setActiveNoteID] = useState<number | null>(null);
  const [loadingSaveLocalStorage, setLoadingSaveLocalStorage] = useState(false);

  // Guardar en localStorage con debounce de 5 segundos
  useEffect(() => {
    // El usuario está escribiendo - marcar como "guardando"
    setLoadingSaveLocalStorage(true);

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        // Guardado exitoso - marcar como "guardado"
        setLoadingSaveLocalStorage(false);
      } catch (error) {
        console.error("Error guardando notas en localStorage:", error);
        setLoadingSaveLocalStorage(false);
      }
    }, 5000);

    // Limpiar el timeout si notes cambia antes de que se cumpla el delay
    return () => clearTimeout(timer);
  }, [notes]);

  const addNote = () => {
    const newNote: INotes = {
      title: "no title",
      thinkings: [],
    };
    setNotes([...notes, newNote]);
  };

  const deleteNote = (index: number) => {
    setNotes(notes.filter((_, i) => i !== index));
  };

  const setActiveNote = (id: number) => {
    setActiveNoteID(id);
  };

  const getActiveNote = () => {
    if (activeNoteID === null) return null;
    return notes[activeNoteID];
  };

  const closeNote = () => {
    setActiveNoteID(null);
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        setNotes,
        addNote,
        deleteNote,
        activeNoteID,
        setActiveNote,
        getActiveNote,
        closeNote,
        loadingSaveLocalStorage,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes debe usarse dentro de un NotesProvider");
  }
  return context;
}
