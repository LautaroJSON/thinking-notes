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
import type { INotes, IsLoggedType, WaitingResponseType } from "../types";
import { v4 as uuidv4 } from "uuid";
import { loadNotesFromStorage, STORAGE_KEY } from "@/components/utils";

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
  isLogged: IsLoggedType;
  saveUpdatesNotesOnDBorLocalStorage: () => void;
  waitingResponse: WaitingResponseType;
}

export const NotesContext = createContext<NotesContextType | undefined>(
  undefined,
);

export const NotesProvider = ({ children }: { children: ReactNode }) => {
  const [notes, setNotes] = useState<INotes[]>([]);
  const [activeNoteState, setActiveNoteState] = useState<INotes | null>(null);
  const [loadingSaveNote, setLoadingSaveNote] = useState<boolean>(false);
  const [isLogged, setIsLogged] = useState<IsLoggedType>("loading");
  const [waitingResponse, setWaitingResponse] =
    useState<WaitingResponseType>("none");

  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsLogged(Boolean(session) ? "online" : "offline");
      } catch (error) {
        console.error("Error verificando sesión de usuario:", error);
        setIsLogged("offline");
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLogged(Boolean(session) ? "online" : "offline");
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

    if (isLogged === "online") {
      loadRemoteNotes();
    } else if (isLogged === "offline") {
      setNotes(loadNotesFromStorage());
    }
  }, [isLogged]);

  const saveUpdatesNotesOnDBorLocalStorage = async () => {
    if (isLogged === "online") {
      try {
        setWaitingResponse("editingNote");
        const response = await updateNoteService(activeNoteState!.id!, {
          title: activeNoteState!.title,
          contentList: activeNoteState!.thinkings,
        });
        console.log("Nota actualizada con ID:", response.id);
        const newArrayNotes = notes.map((note) => {
          if (note.id === response.id) {
            return {
              id: response.id,
              title: response.title,
              thinkings: response.contentList,
            };
          }
          return note;
        });
        setNotes(newArrayNotes);
      } catch (error) {
        console.error("Error guardando notas en localStorage:", error);
      } finally {
        setLoadingSaveNote(false);
        setWaitingResponse("none");
      }
    } else if (isLogged === "offline") {
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
    let newNote: INotes = {
      title: "Nueva Nota :)",
      thinkings: [],
    };

    if (isLogged === "online") {
      try {
        setWaitingResponse("creatingNote");
        const response = await createNoteService({
          title: newNote.title,
          contentList: newNote.thinkings,
        });
        newNote.id = response.id;
        setNotes((prevNotes) => [...prevNotes, newNote]);
      } catch (error) {
        console.error("Error creando nota:", error);
      } finally {
        setWaitingResponse("none");
      }
    } else if (isLogged === "offline") {
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
    if (isLogged === "online") {
      try {
        const deletedNoteIdbyAPI = await deleteNoteService(id);
        console.log("Nota eliminada con ID:", deletedNoteIdbyAPI);
        // todo: agregar estado "deletingNote" para mostrar indicador de carga en la nota que se está eliminando
        setNotes((prevNotes) => {
          const newArrayNote = prevNotes.filter(
            (note) => note.id !== deletedNoteIdbyAPI.id,
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newArrayNote));
          return newArrayNote;
        });
        closeActiveNote();
      } catch (error) {
        console.error("Error eliminando nota:", error);
      }
    } else if (isLogged === "offline") {
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
        waitingResponse,
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
