import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  createNoteService,
  deleteNoteService,
  getNotesService,
  reorderNotesService,
  updateNoteService,
} from "../services/service";
import type { INotes, IsLoggedType, WaitingResponseType } from "../types";
import { v4 as uuidv4 } from "uuid";
import { loadNotesFromStorage, STORAGE_KEY } from "@/components/utils";
import { clearDraft } from "@/components/utils/drafts";
import { applyOrder, moveNote } from "@/components/utils/reorder";
import { NotesContext } from "./notes-context";

export const NotesProvider = ({ children }: { children: ReactNode }) => {
  const [notes, setNotes] = useState<INotes[]>([]);
  const [activeNoteState, setActiveNoteState] = useState<INotes | null>(null);
  const [loadingSaveNote, setLoadingSaveNote] = useState<boolean>(false);
  const [isLogged, setIsLogged] = useState<IsLoggedType>("loading");
  const [waitingResponse, setWaitingResponse] =
    useState<WaitingResponseType>("none");
  const [reorderError, setReorderError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setIsLogged(session ? "online" : "offline");
      } catch (error) {
        console.error("Error verificando sesión de usuario:", error);
        setIsLogged("offline");
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLogged(session ? "online" : "offline");
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadRemoteNotes = async () => {
      setWaitingResponse("gettingNotes");
      try {
        const remoteNotes = await getNotesService();
        setNotes(
          remoteNotes.map((note) => ({
            id: note.id,
            title: note.title,
            thinkings: note.contentList,
            createdAt: note.createdAt ?? undefined,
            updatedAt: note.updatedAt ?? undefined,
          })),
        );
      } catch (error) {
        console.error("Error cargando notas remotas:", error);
        setNotes(loadNotesFromStorage());
      } finally {
        setWaitingResponse("none");
      }
    };

    if (isLogged === "online") {
      loadRemoteNotes();
    } else if (isLogged === "offline") {
      setNotes(loadNotesFromStorage());
    }
  }, [isLogged]);

  // Referencia al estado más reciente para que el guardado tenga una
  // identidad estable: si dependiera de `notes`/`activeNoteState`, cambiaría
  // en cada tecla y después de cada guardado (setNotes), y el efecto que lo
  // invoca al cambiar el valor con debounce volvería a guardar en loop.
  // Se sincroniza en un layout effect para que esté al día antes de que
  // corran los efectos de los componentes hijos.
  const latestStateRef = useRef({ isLogged, activeNoteState, notes });
  useLayoutEffect(() => {
    latestStateRef.current = { isLogged, activeNoteState, notes };
  }, [isLogged, activeNoteState, notes]);

  const saveUpdatesNotesOnDBorLocalStorage = useCallback(async () => {
    const { isLogged, activeNoteState, notes } = latestStateRef.current;
    if (isLogged === "online") {
      try {
        setWaitingResponse("editingNote");
        const response = await updateNoteService(activeNoteState!.id!, {
          title: activeNoteState!.title,
          contentList: activeNoteState!.thinkings,
        });
        console.log("Nota actualizada con ID:", response.id);
        // Forma funcional: mientras esperábamos la respuesta, `notes` pudo
        // cambiar (por ejemplo, el usuario reordenó). Partir del snapshot
        // tomado antes del await pisaría esos cambios.
        setNotes((prevNotes) =>
          prevNotes.map((note) =>
            note.id === response.id
              ? {
                  id: response.id,
                  title: response.title,
                  thinkings: response.contentList,
                  createdAt: response.createdAt ?? undefined,
                  updatedAt: response.updatedAt ?? undefined,
                }
              : note,
          ),
        );
        // Solo las fechas: título e ideas de la nota activa pueden tener
        // cambios más nuevos que la respuesta.
        setActiveNoteState((prev) =>
          prev?.id === response.id
            ? {
                ...prev,
                createdAt: response.createdAt ?? prev.createdAt,
                updatedAt: response.updatedAt ?? prev.updatedAt,
              }
            : prev,
        );
      } catch (error) {
        console.error("Error guardando notas en localStorage:", error);
      } finally {
        setLoadingSaveNote(false);
        setWaitingResponse("none");
      }
    } else if (isLogged === "offline") {
      try {
        const updatedAt = new Date().toISOString();
        const newArrayNotes = notes.map((note) =>
          note.id === activeNoteState?.id
            ? { ...activeNoteState!, updatedAt }
            : note,
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newArrayNotes));
        setNotes(newArrayNotes);
        setActiveNoteState((prev) =>
          prev?.id === activeNoteState?.id ? { ...prev!, updatedAt } : prev,
        );
      } catch (error) {
        console.error("Error guardando notas en localStorage:", error);
      } finally {
        setLoadingSaveNote(false);
      }
    }
  }, []);

  const addNote = async () => {
    const newNote: INotes = {
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
        newNote.createdAt = response.createdAt ?? undefined;
        newNote.updatedAt = response.updatedAt ?? undefined;
        setNotes((prevNotes) => [...prevNotes, newNote]);
        setActiveNoteState(newNote);
      } catch (error) {
        console.error("Error creando nota:", error);
      } finally {
        setWaitingResponse("none");
      }
    } else if (isLogged === "offline") {
      const now = new Date().toISOString();
      const newNoteWithId = {
        ...newNote,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      };
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
        setWaitingResponse("deletingNote");
        const deletedNoteIdbyAPI = await deleteNoteService(id);
        // todo: agregar estado "deletingNote" para mostrar indicador de carga en la nota que se está eliminando
        clearDraft(deletedNoteIdbyAPI.id);
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
      } finally {
        setWaitingResponse("none");
      }
    } else if (isLogged === "offline") {
      clearDraft(id);
      setNotes((prevNotes) => {
        const newArrayNote = prevNotes.filter((note) => note.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newArrayNote));
        return newArrayNote;
      });
      closeActiveNote();
    }
  };

  const REORDER_ERROR_MESSAGE = "No se pudo guardar el orden de las notas.";

  const reorderNotes = async (activeId: string, overId: string) => {
    const nextNotes = moveNote(notes, activeId, overId);
    // Soltar en la misma posición (o ids inexistentes): nada que guardar
    if (nextNotes === notes) return;

    const previousOrder = notes.map((note) => note.id!);
    // Ante un error se vuelve al orden anterior sin descartar cambios de
    // contenido que hayan llegado mientras tanto.
    const revertOrder = () =>
      setNotes((prevNotes) => applyOrder(prevNotes, previousOrder));

    setReorderError(null);
    setNotes(nextNotes);

    if (isLogged === "online") {
      setWaitingResponse("reorderingNotes");
      try {
        await reorderNotesService(nextNotes.map((note) => note.id!));
      } catch (error) {
        console.error("Error guardando el orden de las notas:", error);
        revertOrder();
        setReorderError(REORDER_ERROR_MESSAGE);
      } finally {
        setWaitingResponse("none");
      }
    } else if (isLogged === "offline") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes));
      } catch (error) {
        console.error("Error guardando el orden en localStorage:", error);
        revertOrder();
        setReorderError(REORDER_ERROR_MESSAGE);
      }
    }
  };

  // Identidad estable: el sidebar la usa como dependencia de un efecto que
  // oculta el aviso; si cambiara en cada render, el temporizador se reiniciaría.
  const clearReorderError = useCallback(() => {
    setReorderError(null);
  }, []);

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
        reorderNotes,
        reorderError,
        clearReorderError,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};
