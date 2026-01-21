import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
} from "react";
import type { INotes } from "../types";

const _EXAMPLE_INITIALS_NOTES_: INotes[] = [
  {
    title: "Proyecto React",
    thinkings: [
      "Componentes reutilizables",
      "State management con Context API",
      "Hooks personalizados",
    ],
  },
  {
    title: "Aprendizaje TypeScript",
    thinkings: [
      "Interfaces y tipos genéricos",
      "Decoradores y metadatos",
      "Tipos utilitarios avanzados",
    ],
  },
  {
    title: "Ideas de aplicación",
    thinkings: [
      "App de notas colaborativa",
      "Sistema de autenticación OAuth",
      "Base de datos en tiempo real",
    ],
  },
  {
    title: "Mejoras de rendimiento",
    thinkings: [
      "Lazy loading de componentes",
      "Optimización de renders",
      "Code splitting automático",
    ],
  },
  {
    title: "Próximos pasos",
    thinkings: [
      "Implementar persistencia en localStorage",
      "Agregar temas oscuro/claro",
      "Exportar notas a PDF",
    ],
  },
];

const STORAGE_KEY = "notes";

// Cargar notas desde localStorage o usar las predeterminadas
const loadNotesFromStorage = (): INotes[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : _EXAMPLE_INITIALS_NOTES_;
  } catch (error) {
    console.error("Error cargando notas desde localStorage:", error);
    return _EXAMPLE_INITIALS_NOTES_;
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
