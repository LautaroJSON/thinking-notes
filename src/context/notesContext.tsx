import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
} from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  createNoteService,
  deleteNoteService,
  getNotesService,
  updateNoteService,
} from "../services/service";
import type { INotes } from "../types";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "notes";

const loadNotesFromStorage = (): INotes[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error cargando notas desde localStorage:", error);
    return [];
  }
};

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

export const NotesContext = createContext<NotesContextType | undefined>(
  undefined,
);

export const NotesProvider = ({ children }: { children: ReactNode }) => {
  const [notes, setNotes] = useState<INotes[]>([]);
  const [activeNoteState, setActiveNoteState] = useState<INotes | null>(null);
  const [loadingSaveNote, setLoadingSaveNote] = useState<boolean>(false);
  const [isLogged, setIsLogged] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsLogged(Boolean(session));
      } catch (error) {
        console.error("Error verificando sesión de usuario:", error);
        setIsLogged(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLogged(Boolean(session));
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadRemoteNotes = async () => {
      try {
        const remoteNotes = await getNotesService();
        setNotes(
          remoteNotes.map((note) => ({
            id: note.id,
            title: note.title,
            thinkings: note.contentList,
          })),
        );
      } catch (error) {
        console.error("Error cargando notas remotas:", error);
        setNotes(loadNotesFromStorage());
      }
    };

    if (isLogged) {
      loadRemoteNotes();
    } else {
      setNotes(loadNotesFromStorage());
    }
  }, [isLogged]);

  const saveUpdatesNotesOnDBorLocalStorage = async () => {
    console.log("Guardando notas...");

    if (isLogged) {
      try {
        const response = await updateNoteService(
          activeNoteState!.id!,
          activeNoteState!,
        );
        console.log("Nota actualizada con ID:", response);
      } catch (error) {
        console.error("Error guardando notas en localStorage:", error);
      } finally {
        setLoadingSaveNote(false);
      }
    } else {
      try {
        const newArrayNotes = notes.map((note) =>
          note.id === activeNoteState?.id ? activeNoteState! : note,
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newArrayNotes));
        setNotes(newArrayNotes);
      } catch (error) {
        console.error("Error guardando notas en localStorage:", error);
      } finally {
        setLoadingSaveNote(false);
      }
    }
  };

  const addNote = async () => {
    console.log("Agregando nota...");
    const newNote: INotes = {
      title: "Nueva Nota :)",
      thinkings: [],
    };

    if (isLogged) {
      try {
        const response = await createNoteService({
          title: newNote.title,
          contentList: newNote.thinkings,
        });
        console.log("Nota creada con ID:", response);
        setNotes((prevNotes) => [...prevNotes, newNote]);
      } catch (error) {
        console.error("Error creando nota:", error);
      }
    } else {
      const newNoteWithId = { ...newNote, id: uuidv4() };
      const newArrayNote = [...notes, newNoteWithId];
      setNotes(newArrayNote);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newArrayNote));
      } catch (error) {
        console.error("Error guardando notas en localStorage:", error);
      }
      setActiveNoteState(newNoteWithId);
    }
  };

  const deleteNote = async (id: string) => {
    if (isLogged) {
      try {
        const deletedNoteIdbyAPI = await deleteNoteService(id);
        console.log("Nota eliminada con ID:", deletedNoteIdbyAPI);
        // todo: eliminar nota del estado después de confirmación de eliminación
      } catch (error) {
        console.error("Error eliminando nota:", error);
      }
    } else {
      setNotes((prevNotes) => {
        const newArrayNote = prevNotes.filter((note) => note.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newArrayNote));
        return newArrayNote;
      });
      closeActiveNote();
    }
  };

  // Funciones para manejar la nota activa

  const setActiveNote = (id: string) => {
    const newSelectedNote = notes.find((note) => note.id === id);
    setActiveNoteState(newSelectedNote || null);
  };

  const getActiveNote = (): INotes | null => {
    return activeNoteState;
  };

  const updateActiveNote = (updates: Partial<INotes>) => {
    if (!activeNoteState?.id) return;
    // setLoadingSaveNote(true);

    setActiveNoteState((prev) => {
      if (!prev) return prev;
      const updatedNote = { ...prev, ...updates };
      return updatedNote;
    });
  };

  const closeActiveNote = () => {
    setActiveNoteState(null);
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        setNotes,
        addNote,
        deleteNote,
        setActiveNote,
        getActiveNote,
        activeNoteState,
        updateActiveNote,
        closeActiveNote,
        loadingSaveNote,
        setLoadingSaveNote,
        isLogged,
        saveUpdatesNotesOnDBorLocalStorage,
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
