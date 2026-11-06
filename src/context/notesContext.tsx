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
import {
  createImageThinking,
  getImageRefs,
  isImageThinking,
  isLocalRef,
  type ImageRef,
} from "@/types/thinking";
import {
  primeImageUrl,
  remoteImageStore,
  storeForMode,
  toImageStoreError,
} from "@/services/images/imageStore";
import {
  collectImageRefs,
  enqueueImageDeletions,
  processImageDeletionQueue,
  sweepLocalOrphans,
  sweepRemoteNote,
} from "@/services/images/imageCleanup";
import { v4 as uuidv4 } from "uuid";
import { loadNotesFromStorage, STORAGE_KEY } from "@/components/utils";
import { clearDraft } from "@/components/utils/drafts";
import { discardPendingImages } from "@/hooks/usePendingImages";
import { playSound } from "@/hooks/useSounds";
import { applyOrder, moveNote } from "@/components/utils/reorder";
import { NotesContext } from "./notes-context";

// Solo en desarrollo: demora la carga offline (casi instantánea) para poder
// ver la animación de carga de la lista. En tests y producción es 0.
const SIMULATED_OFFLINE_LOAD_MS =
  import.meta.env.DEV && import.meta.env.MODE !== "test" ? 3000 : 0;

export const NotesProvider = ({ children }: { children: ReactNode }) => {
  const [notes, setNotes] = useState<INotes[]>([]);
  const [activeNoteState, setActiveNoteState] = useState<INotes | null>(null);
  const [loadingSaveNote, setLoadingSaveNote] = useState<boolean>(false);
  const [isLogged, setIsLogged] = useState<IsLoggedType>("loading");
  const [waitingResponse, setWaitingResponse] =
    useState<WaitingResponseType>("none");
  const [reorderError, setReorderError] = useState<string | null>(null);
  // Pedidos de guardado inmediato y de limpieza de imágenes: se atienden en
  // efectos, así corren con el estado ya confirmado (latestStateRef al día)
  const [flushRequest, setFlushRequest] = useState(0);
  const [cleanupRequest, setCleanupRequest] = useState(0);
  const sweptLocalRef = useRef(false);

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
        setCleanupRequest((n) => n + 1);
      }
    };

    if (isLogged === "online") {
      loadRemoteNotes();
    } else if (isLogged === "offline") {
      const loadLocalNotes = () => {
        setNotes(loadNotesFromStorage());
        setCleanupRequest((n) => n + 1);
      };
      if (SIMULATED_OFFLINE_LOAD_MS > 0) {
        setWaitingResponse("gettingNotes");
        const timer = setTimeout(() => {
          loadLocalNotes();
          setWaitingResponse("none");
        }, SIMULATED_OFFLINE_LOAD_MS);
        return () => {
          clearTimeout(timer);
          setWaitingResponse("none");
        };
      }
      loadLocalNotes();
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
        setCleanupRequest((n) => n + 1);
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
        setCleanupRequest((n) => n + 1);
      } catch (error) {
        console.error("Error guardando notas en localStorage:", error);
      } finally {
        setLoadingSaveNote(false);
      }
    }
  }, []);

  // Una referencia está "en uso" si alguna nota cargada la tiene. Para las
  // locales también cuentan las notas guardadas en localStorage (con sesión,
  // las notas en memoria son las remotas). Nunca se borra algo en uso.
  const isImageReferenced = useCallback((ref: ImageRef) => {
    const { notes, activeNoteState } = latestStateRef.current;
    if (collectImageRefs([...notes, activeNoteState]).has(ref)) return true;
    return isLocalRef(ref) && collectImageRefs(loadNotesFromStorage()).has(ref);
  }, []);

  useEffect(() => {
    if (flushRequest > 0) saveUpdatesNotesOnDBorLocalStorage();
  }, [flushRequest, saveUpdatesNotesOnDBorLocalStorage]);

  useEffect(() => {
    if (cleanupRequest === 0) return;
    const { isLogged } = latestStateRef.current;
    if (isLogged === "loading") return;
    void processImageDeletionQueue(isImageReferenced, {
      online: isLogged === "online",
    });
    // Limpieza de respaldo de imágenes locales, una vez por sesión de la app
    if (isLogged === "offline" && !sweptLocalRef.current) {
      sweptLocalRef.current = true;
      void sweepLocalOrphans(isImageReferenced);
    }
  }, [cleanupRequest, isImageReferenced]);

  /** Guarda ya la nota activa, sin esperar el debounce del editor. */
  const flushSave = useCallback(() => {
    setLoadingSaveNote(true);
    setFlushRequest((n) => n + 1);
  }, []);

  /**
   * Guarda las imágenes y agrega a la nota activa un pensamiento con todas
   * ellas (y el texto, si hay). Si alguna falla, la nota no cambia, se borran
   * las que sí se guardaron y se lanza un ImageStoreError con el mensaje.
   */
  const addImageThinking = async (
    blobs: Blob[],
    text: string,
  ): Promise<boolean> => {
    const note = latestStateRef.current.activeNoteState;
    if (!note?.id || blobs.length === 0) return false;
    const noteId = note.id;
    const store = storeForMode(latestStateRef.current.isLogged);

    setWaitingResponse("uploadingImages");
    setLoadingSaveNote(true);
    try {
      const results = await Promise.allSettled(
        blobs.map((blob) => store.save(blob, { noteId })),
      );
      const saved = results.flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : [],
      );
      const failure = results.find((r) => r.status === "rejected");

      if (failure) {
        try {
          await store.remove(saved);
        } catch {
          enqueueImageDeletions(saved);
        }
        throw toImageStoreError(failure.reason);
      }

      // Si mientras tanto se cambió de nota, no se agrega a otra: los
      // archivos se descartan (sin huérfanos) y las imágenes siguen
      // pendientes en su nota para volver a enviarlas
      if (latestStateRef.current.activeNoteState?.id !== noteId) {
        console.warn("Se cambió de nota durante la subida; no se agregan.");
        enqueueImageDeletions(saved);
        setCleanupRequest((n) => n + 1);
        setLoadingSaveNote(false);
        return false;
      }

      // Mismo orden que `blobs` (allSettled conserva el orden y no hubo fallas)
      saved.forEach((ref, i) => primeImageUrl(ref, blobs[i]));
      const thinking = createImageThinking(saved, text);
      setActiveNoteState((prev) =>
        prev?.id === noteId
          ? { ...prev, thinkings: [...prev.thinkings, thinking] }
          : prev,
      );
      flushSave();
      return true;
    } catch (error) {
      setLoadingSaveNote(false);
      throw toImageStoreError(error);
    } finally {
      setWaitingResponse("none");
    }
  };

  /** Borra un pensamiento de la nota activa y encola sus imágenes. */
  const removeThinking = (thinkingId: string) => {
    const note = latestStateRef.current.activeNoteState;
    const thinking = note?.thinkings.find((t) => t.id === thinkingId);
    if (!note || !thinking) return;
    enqueueImageDeletions(getImageRefs(thinking));
    setActiveNoteState((prev) =>
      prev && prev.id === note.id
        ? {
            ...prev,
            thinkings: prev.thinkings.filter((t) => t.id !== thinkingId),
          }
        : prev,
    );
    flushSave();
  };

  /**
   * Aplica la edición de un pensamiento con imágenes: quita las imágenes
   * indicadas y actualiza el texto. Sin imágenes, pasa a ser de texto (mismo
   * id) o, si tampoco tiene texto, se borra.
   */
  const editImageThinking = (
    thinkingId: string,
    { removedRefs, text }: { removedRefs: ImageRef[]; text: string },
  ) => {
    const note = latestStateRef.current.activeNoteState;
    const thinking = note?.thinkings.find((t) => t.id === thinkingId);
    if (!note || !thinking || !isImageThinking(thinking)) return;

    const removed = new Set(removedRefs);
    const remaining = thinking.value.filter((ref) => !removed.has(ref));
    const trimmed = text.trim();
    const actuallyRemoved = thinking.value.filter((ref) => removed.has(ref));

    let next: INotes["thinkings"];
    if (remaining.length > 0) {
      const updated = {
        id: thinking.id,
        type: "image" as const,
        value: remaining,
        ...(trimmed ? { text: trimmed } : {}),
      };
      next = note.thinkings.map((t) => (t.id === thinkingId ? updated : t));
    } else if (trimmed) {
      next = note.thinkings.map((t) =>
        t.id === thinkingId
          ? { id: thinkingId, type: "text" as const, value: trimmed }
          : t,
      );
    } else {
      next = note.thinkings.filter((t) => t.id !== thinkingId);
    }

    enqueueImageDeletions(actuallyRemoved);
    setActiveNoteState((prev) =>
      prev && prev.id === note.id ? { ...prev, thinkings: next } : prev,
    );
    flushSave();
  };

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
        playSound("create");
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
      playSound("create");
    }
  };

  const deleteNote = async (id: string) => {
    const { notes: currentNotes, activeNoteState: current } =
      latestStateRef.current;
    enqueueImageDeletions([
      ...collectImageRefs([
        currentNotes.find((note) => note.id === id),
        current?.id === id ? current : null,
      ]),
    ]);

    if (isLogged === "online") {
      try {
        setWaitingResponse("deletingNote");
        const deletedNoteIdbyAPI = await deleteNoteService(id);
        // Los archivos de la nota se borran después del borrado en la API;
        // si falla, quedan en la cola de pendientes (ya encolados arriba)
        void remoteImageStore
          .removeNoteFolder(id)
          .catch((error: unknown) =>
            console.error("No se pudieron borrar las imágenes:", error),
          );
        // todo: agregar estado "deletingNote" para mostrar indicador de carga en la nota que se está eliminando
        clearDraft(deletedNoteIdbyAPI.id);
        discardPendingImages(deletedNoteIdbyAPI.id);
        setNotes((prevNotes) => {
          const newArrayNote = prevNotes.filter(
            (note) => note.id !== deletedNoteIdbyAPI.id,
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newArrayNote));
          return newArrayNote;
        });
        closeActiveNote();
        setCleanupRequest((n) => n + 1);
        playSound("remove");
      } catch (error) {
        console.error("Error eliminando nota:", error);
      } finally {
        setWaitingResponse("none");
      }
    } else if (isLogged === "offline") {
      clearDraft(id);
      discardPendingImages(id);
      setNotes((prevNotes) => {
        const newArrayNote = prevNotes.filter((note) => note.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newArrayNote));
        return newArrayNote;
      });
      closeActiveNote();
      setCleanupRequest((n) => n + 1);
      playSound("remove");
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
    // Con sesión, limpieza de respaldo de la carpeta de la nota (sin bloquear)
    if (isLogged === "online" && newSelectedNote) {
      void sweepRemoteNote(id, isImageReferenced);
    }
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
        addImageThinking,
        editImageThinking,
        removeThinking,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};
