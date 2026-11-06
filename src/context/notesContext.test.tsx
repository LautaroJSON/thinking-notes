import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "@/components/utils";
import ActiveNoteView from "@/components/notes/noteContent/components/activeNoteView";
import { useNotes } from "@/hooks/useNotes";
import { __resetPendingImagesForTests } from "@/hooks/usePendingImages";
import { NotesProvider } from "./notesContext";

const { getSession, onAuthStateChange } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: { auth: { getSession, onAuthStateChange } },
}));

const { playSoundMock } = vi.hoisted(() => ({ playSoundMock: vi.fn() }));
vi.mock("@/hooks/useSounds", () => ({
  default: () => ({
    prefs: { enabled: true, typing: true, selection: true, actions: true },
    setEnabled: vi.fn(),
    setCategory: vi.fn(),
    play: playSoundMock,
  }),
  playSound: playSoundMock,
}));

vi.mock("../services/service", () => ({
  getNotesService: vi.fn(),
  createNoteService: vi.fn(),
  updateNoteService: vi.fn(),
  deleteNoteService: vi.fn(),
  reorderNotesService: vi.fn(),
}));

const { localStore, remoteStore } = vi.hoisted(() => ({
  localStore: {
    save: vi.fn(),
    remove: vi.fn(),
    getUrls: vi.fn(),
    getBlob: vi.fn(),
    listAll: vi.fn(),
  },
  remoteStore: {
    save: vi.fn(),
    remove: vi.fn(),
    getUrls: vi.fn(),
    getBlob: vi.fn(),
    listForNote: vi.fn(),
    removeNoteFolder: vi.fn(),
    invalidateUrl: vi.fn(),
  },
}));

const { compressImage } = vi.hoisted(() => ({ compressImage: vi.fn() }));
vi.mock("@/components/utils/imageProcessing", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/components/utils/imageProcessing")
  >()),
  compressImage,
}));

vi.mock("@/services/images/localImageStore", () => ({
  localImageStore: localStore,
}));
vi.mock("@/services/images/remoteImageStore", () => ({
  remoteImageStore: remoteStore,
}));

import * as service from "../services/service";
import { ImageStoreError } from "@/services/images/errors";
import { __resetPrimedUrlsForTests } from "@/services/images/imageStore";
import {
  getPendingImageDeletions,
  QUEUE_KEY,
} from "@/services/images/imageCleanup";

const THINKING_A = { id: "ta", type: "text" as const, value: "a" };
const SAVED_NOTE = { id: "n1", title: "Idea", thinkings: [THINKING_A] };

const mockSession = (online: boolean) => {
  getSession.mockResolvedValue({
    data: { session: online ? { access_token: "token" } : null },
  });
};

// Si el guardado entra en loop, el test colgaría para siempre. Este "fusible"
// hace fallar la escritura después de unas pocas llamadas: el provider atrapa el
// error, no vuelve a llamar a setNotes y el loop se corta, así el test falla
// mostrando cuántas veces se guardó en lugar de quedarse colgado.
const MAX_CALLS = 5;
const spyOnSetItemWithFuse = () => {
  const originalSetItem = Storage.prototype.setItem;
  const setItem = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(function (this: Storage, key, value) {
      if (setItem.mock.calls.length > MAX_CALLS) {
        throw new Error("guardado en loop");
      }
      originalSetItem.call(this, key, value);
    });
  return setItem;
};

// Deja que se resuelvan las promesas pendientes (sesión, carga de notas)
const flush = () => act(async () => {});

// Abre la primera nota en cuanto el provider la cargó
const OpenFirstNote = () => {
  const { notes, activeNoteState, setActiveNote } = useNotes();
  if (activeNoteState) return <ActiveNoteView />;
  return (
    <button
      onClick={() => setActiveNote(notes[0].id!)}
      disabled={!notes.length}
    >
      abrir
    </button>
  );
};

const renderEditor = async () => {
  render(
    <NotesProvider>
      <OpenFirstNote />
    </NotesProvider>,
  );
  await flush();
  fireEvent.click(screen.getByText("abrir"));
  return screen.getByPlaceholderText("Sin título");
};

describe("NotesProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    localStore.remove.mockResolvedValue(undefined);
    localStore.listAll.mockResolvedValue([]);
    localStore.getUrls.mockResolvedValue(new Map());
    remoteStore.remove.mockResolvedValue(undefined);
    remoteStore.listForNote.mockResolvedValue([]);
    remoteStore.removeNoteFolder.mockResolvedValue(undefined);
    remoteStore.getUrls.mockResolvedValue(new Map());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
    __resetPrimedUrlsForTests();
  });

  it("mantiene estable la identidad de saveUpdatesNotesOnDBorLocalStorage", async () => {
    mockSession(false);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotesProvider>{children}</NotesProvider>
    );
    const { result } = renderHook(() => useNotes(), { wrapper });
    await flush();
    const firstSave = result.current.saveUpdatesNotesOnDBorLocalStorage;

    await act(async () => {
      result.current.addNote();
    });
    act(() => {
      result.current.updateActiveNote({ title: "otro" });
    });

    expect(result.current.notes).toHaveLength(1);
    expect(result.current.saveUpdatesNotesOnDBorLocalStorage).toBe(firstSave);
  });

  describe("guardado con debounce desde ActiveNoteView", () => {
    it("offline: guarda en localStorage una sola vez y no entra en loop", async () => {
      mockSession(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([SAVED_NOTE]));
      const setItem = spyOnSetItemWithFuse();

      const titleInput = await renderEditor();
      fireEvent.change(titleInput, { target: { value: "Idea editada" } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1999);
      });
      expect(setItem).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(setItem).toHaveBeenCalledTimes(1);

      // Pasado un buen rato sin cambios, no hay guardados extra
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(setItem).toHaveBeenCalledTimes(1);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([
        { ...SAVED_NOTE, title: "Idea editada", updatedAt: expect.any(String) },
      ]);
      expect(service.updateNoteService).not.toHaveBeenCalled();
    });

    it("online: llama a la API una sola vez y no entra en loop", async () => {
      mockSession(true);
      vi.mocked(service.getNotesService).mockResolvedValue([
        {
          id: "n1",
          title: "Idea",
          contentList: [THINKING_A],
          createdAt: "2026-11-01T12:00:00.000Z",
          updatedAt: "2026-11-01T12:00:00.000Z",
        },
      ]);
      vi.mocked(service.updateNoteService).mockImplementation(
        async (id, payload) => {
          if (
            vi.mocked(service.updateNoteService).mock.calls.length > MAX_CALLS
          ) {
            throw new Error("guardado en loop");
          }
          return {
            id,
            userId: "u1",
            title: payload.title ?? "",
            contentList: payload.contentList ?? [],
            createdAt: "2026-11-01T12:00:00.000Z",
            updatedAt: "2026-11-05T12:00:00.000Z",
          };
        },
      );

      const titleInput = await renderEditor();
      fireEvent.change(titleInput, { target: { value: "Idea editada" } });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(service.updateNoteService).toHaveBeenCalledTimes(1);
      expect(service.updateNoteService).toHaveBeenCalledWith("n1", {
        title: "Idea editada",
        contentList: [THINKING_A],
      });
      expect(screen.getByDisplayValue("Idea editada")).toBeTruthy();

      // La nota activa refleja la fecha de modificación que devolvió la API
      fireEvent.click(screen.getByLabelText("Información de la nota"));
      expect(screen.getByText(/1 de noviembre de 2026/)).toBeTruthy();
      expect(screen.getByText(/5 de noviembre de 2026/)).toBeTruthy();
    });

    it("guarda el último valor tras varias ediciones seguidas", async () => {
      mockSession(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([SAVED_NOTE]));
      const setItem = spyOnSetItemWithFuse();

      const titleInput = await renderEditor();
      for (const title of ["I", "Id", "Ide"]) {
        fireEvent.change(titleInput, { target: { value: title } });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(500);
        });
      }
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(setItem).toHaveBeenCalledTimes(1);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0].title).toBe(
        "Ide",
      );
    });
  });

  describe("reorderNotes", () => {
    const LOCAL_NOTES = ["A", "B", "C"].map((id) => ({
      id,
      title: id,
      thinkings: [],
    }));
    const REMOTE_NOTES = ["A", "B", "C"].map((id) => ({
      id,
      title: id,
      contentList: [],
      createdAt: null,
      updatedAt: null,
    }));
    const ids = (notes: { id?: string }[]) => notes.map((n) => n.id);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotesProvider>{children}</NotesProvider>
    );
    const renderNotes = async () => {
      const hook = renderHook(() => useNotes(), { wrapper });
      await flush();
      return hook;
    };

    const deferred = <T,>() => {
      let resolve!: (value: T) => void;
      let reject!: (reason: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };

    beforeEach(() => {
      vi.mocked(service.reorderNotesService).mockReset();
      vi.mocked(service.updateNoteService).mockReset();
    });

    describe("offline", () => {
      beforeEach(() => {
        mockSession(false);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(LOCAL_NOTES));
      });

      it("reordena las notas y guarda el orden en localStorage", async () => {
        const { result, unmount } = await renderNotes();

        await act(() => result.current.reorderNotes("C", "A"));

        expect(ids(result.current.notes)).toEqual(["C", "A", "B"]);
        expect(ids(JSON.parse(localStorage.getItem(STORAGE_KEY)!))).toEqual([
          "C",
          "A",
          "B",
        ]);
        expect(service.reorderNotesService).not.toHaveBeenCalled();

        // Al volver a abrir la app se carga en el orden guardado
        unmount();
        const { result: reloaded } = await renderNotes();
        expect(ids(reloaded.current.notes)).toEqual(["C", "A", "B"]);
      });

      it("no guarda nada si se suelta en la misma posición", async () => {
        const { result } = await renderNotes();
        const before = result.current.notes;
        const setItem = vi.spyOn(Storage.prototype, "setItem");

        await act(() => result.current.reorderNotes("B", "B"));

        expect(result.current.notes).toBe(before);
        expect(setItem).not.toHaveBeenCalled();
      });

      it("mantiene abierta la nota activa después de reordenar", async () => {
        const { result } = await renderNotes();
        act(() => result.current.setActiveNote("A"));

        await act(() => result.current.reorderNotes("A", "C"));

        expect(ids(result.current.notes)).toEqual(["B", "C", "A"]);
        expect(result.current.activeNoteState?.id).toBe("A");
      });

      it("si falla localStorage vuelve al orden anterior y avisa", async () => {
        const { result } = await renderNotes();
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
          throw new Error("cuota excedida");
        });

        await act(() => result.current.reorderNotes("C", "A"));

        expect(ids(result.current.notes)).toEqual(["A", "B", "C"]);
        expect(result.current.reorderError).toBeTruthy();

        act(() => result.current.clearReorderError());
        expect(result.current.reorderError).toBeNull();
      });
    });

    describe("online", () => {
      beforeEach(() => {
        mockSession(true);
        vi.mocked(service.getNotesService).mockResolvedValue(REMOTE_NOTES);
      });

      it("guarda el orden en la API mostrando el estado de carga", async () => {
        const { result } = await renderNotes();
        const request = deferred<{ ids: string[] }>();
        vi.mocked(service.reorderNotesService).mockReturnValue(
          request.promise,
        );

        let pending!: Promise<void>;
        act(() => {
          pending = result.current.reorderNotes("C", "A");
        });

        expect(ids(result.current.notes)).toEqual(["C", "A", "B"]);
        expect(result.current.waitingResponse).toBe("reorderingNotes");
        expect(service.reorderNotesService).toHaveBeenCalledWith([
          "C",
          "A",
          "B",
        ]);

        await act(async () => {
          request.resolve({ ids: ["C", "A", "B"] });
          await pending;
        });

        expect(result.current.waitingResponse).toBe("none");
        expect(result.current.reorderError).toBeNull();
        expect(ids(result.current.notes)).toEqual(["C", "A", "B"]);
      });

      it("si la API falla vuelve al orden anterior y avisa", async () => {
        const { result } = await renderNotes();
        vi.mocked(service.reorderNotesService).mockRejectedValue(
          new Error("500"),
        );

        await act(() => result.current.reorderNotes("C", "A"));

        expect(ids(result.current.notes)).toEqual(["A", "B", "C"]);
        expect(result.current.reorderError).toBeTruthy();
        expect(result.current.waitingResponse).toBe("none");
      });

      it("un guardado de nota en vuelo no pisa el nuevo orden", async () => {
        const { result } = await renderNotes();
        const update = deferred<Awaited<
          ReturnType<typeof service.updateNoteService>
        >>();
        vi.mocked(service.updateNoteService).mockReturnValue(update.promise);
        vi.mocked(service.reorderNotesService).mockResolvedValue({
          ids: ["C", "A", "B"],
        });

        act(() => result.current.setActiveNote("A"));
        act(() => result.current.updateActiveNote({ title: "A editada" }));

        let saving!: Promise<void> | void;
        act(() => {
          saving = result.current.saveUpdatesNotesOnDBorLocalStorage();
        });

        // Mientras el guardado está en vuelo, el orden cambia
        await act(() => result.current.reorderNotes("C", "A"));

        await act(async () => {
          update.resolve({
            id: "A",
            userId: "u1",
            title: "A editada",
            contentList: [],
            createdAt: "",
            updatedAt: "",
          });
          await saving;
        });

        expect(ids(result.current.notes)).toEqual(["C", "A", "B"]);
        expect(result.current.notes[1].title).toBe("A editada");
      });
    });
  });
  describe("pensamientos con imágenes", () => {
    const TEXT = { id: "t1", type: "text" as const, value: "texto" };
    const IMAGE = {
      id: "i1",
      type: "image" as const,
      value: ["local:x", "local:y"],
      text: "pie",
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotesProvider>{children}</NotesProvider>
    );
    const blob = (name: string) => new Blob([name], { type: "image/webp" });

    const openNote = async (id = "n1") => {
      const hook = renderHook(() => useNotes(), { wrapper });
      await flush();
      act(() => hook.result.current.setActiveNote(id));
      return hook;
    };
    const storedNote = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0];

    afterEach(() => {
      Object.values(localStore).forEach((fn) => fn.mockReset());
      Object.values(remoteStore).forEach((fn) => fn.mockReset());
      vi.mocked(service.updateNoteService).mockReset();
      vi.mocked(service.deleteNoteService).mockReset();
    });

    describe("sin sesión", () => {
      beforeEach(() => {
        mockSession(false);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify([{ id: "n1", title: "N", thinkings: [TEXT, IMAGE] }]),
        );
      });

      it("guarda todas las imágenes en un único pensamiento y lo persiste ya", async () => {
        localStore.save
          .mockResolvedValueOnce("local:a")
          .mockResolvedValueOnce("local:b");
        const { result } = await openNote();

        await act(() =>
          result.current.addImageThinking([blob("a"), blob("b")], "  hola  "),
        );
        await flush();

        const added = {
          id: expect.any(String),
          type: "image",
          value: ["local:a", "local:b"],
          text: "hola",
        };
        expect(result.current.activeNoteState?.thinkings[2]).toEqual(added);
        // Sin esperar el debounce del editor
        expect(storedNote().thinkings[2]).toEqual(added);
        expect(localStore.save).toHaveBeenCalledWith(expect.any(Blob), {
          noteId: "n1",
        });
        expect(result.current.waitingResponse).toBe("none");
        expect(result.current.loadingSaveNote).toBe(false);
      });

      it("omite el texto si está vacío", async () => {
        localStore.save.mockResolvedValueOnce("local:a");
        const { result } = await openNote();

        await act(() => result.current.addImageThinking([blob("a")], "   "));

        expect(result.current.activeNoteState?.thinkings[2]).toEqual({
          id: expect.any(String),
          type: "image",
          value: ["local:a"],
        });
      });

      it("si una imagen falla no cambia la nota y deshace las guardadas", async () => {
        localStore.save
          .mockResolvedValueOnce("local:a")
          .mockRejectedValueOnce(new ImageStoreError("quota"));
        const { result } = await openNote();

        const error = await act(() =>
          result.current
            .addImageThinking([blob("a"), blob("b")], "")
            .catch((e: unknown) => e),
        );

        expect(error).toBeInstanceOf(ImageStoreError);
        expect(error).toMatchObject({ code: "quota" });
        expect(result.current.activeNoteState?.thinkings).toEqual([
          TEXT,
          IMAGE,
        ]);
        expect(localStore.remove).toHaveBeenCalledWith(["local:a"]);
        expect(result.current.loadingSaveNote).toBe(false);
      });

      it("si falla deshacer la subida, encola los archivos", async () => {
        localStore.save
          .mockResolvedValueOnce("local:a")
          .mockRejectedValueOnce(new Error("boom"));
        localStore.remove.mockRejectedValue(new Error("tampoco"));
        const { result } = await openNote();

        await act(() =>
          result.current
            .addImageThinking([blob("a"), blob("b")], "")
            .catch(() => {}),
        );

        expect(getPendingImageDeletions()).toContain("local:a");
      });

      it("borrar un pensamiento con imágenes guarda y borra sus archivos", async () => {
        const { result } = await openNote();

        act(() => result.current.removeThinking("i1"));
        await flush();
        await flush();

        expect(storedNote().thinkings).toEqual([TEXT]);
        expect(localStore.remove).toHaveBeenCalledWith(["local:x"]);
        expect(localStore.remove).toHaveBeenCalledWith(["local:y"]);
        expect(getPendingImageDeletions()).toEqual([]);
      });

      it("si falla el guardado no borra archivos que la nota sigue usando", async () => {
        const { result } = await openNote();
        const originalSetItem = Storage.prototype.setItem;
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
          this: Storage,
          key,
          value,
        ) {
          if (key === STORAGE_KEY) throw new Error("cuota excedida");
          originalSetItem.call(this, key, value);
        });

        act(() => result.current.removeThinking("i1"));
        await flush();

        expect(localStore.remove).not.toHaveBeenCalled();
        expect(getPendingImageDeletions()).toEqual(["local:x", "local:y"]);
      });

      describe("editImageThinking", () => {
        it("quita una imagen y conserva el resto", async () => {
          const { result } = await openNote();

          act(() =>
            result.current.editImageThinking("i1", {
              removedRefs: ["local:x"],
              text: "nuevo pie",
            }),
          );
          await flush();
          await flush();

          expect(storedNote().thinkings[1]).toEqual({
            id: "i1",
            type: "image",
            value: ["local:y"],
            text: "nuevo pie",
          });
          expect(localStore.remove).toHaveBeenCalledTimes(1);
          expect(localStore.remove).toHaveBeenCalledWith(["local:x"]);
        });

        it("sin imágenes y con texto pasa a ser de texto con el mismo id", async () => {
          const { result } = await openNote();

          act(() =>
            result.current.editImageThinking("i1", {
              removedRefs: ["local:x", "local:y"],
              text: "solo texto",
            }),
          );
          await flush();

          expect(storedNote().thinkings[1]).toEqual({
            id: "i1",
            type: "text",
            value: "solo texto",
          });
        });

        it("sin imágenes ni texto se borra", async () => {
          const { result } = await openNote();

          act(() =>
            result.current.editImageThinking("i1", {
              removedRefs: ["local:x", "local:y"],
              text: "  ",
            }),
          );
          await flush();

          expect(storedNote().thinkings).toEqual([TEXT]);
        });
      });

      it("borrar la nota borra todas sus imágenes", async () => {
        const { result } = await openNote();

        await act(() => result.current.deleteNote("n1"));
        await flush();

        expect(result.current.notes).toEqual([]);
        expect(localStore.remove).toHaveBeenCalledWith(["local:x"]);
        expect(localStore.remove).toHaveBeenCalledWith(["local:y"]);
      });

      it("al iniciar procesa la cola y limpia imágenes locales huérfanas", async () => {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(["local:pendiente"]));
        localStore.listAll.mockResolvedValue([
          { ref: "local:huerfana", createdAt: 0 },
          { ref: "local:x", createdAt: 0 },
        ]);

        renderHook(() => useNotes(), { wrapper });
        await flush();
        await flush();

        expect(localStore.remove).toHaveBeenCalledWith(["local:pendiente"]);
        expect(localStore.remove).toHaveBeenCalledWith(["local:huerfana"]);
        expect(localStore.remove).not.toHaveBeenCalledWith(["local:x"]);
      });
    });

    describe("con sesión", () => {
      const REMOTE_IMAGE = { id: "r1", type: "image" as const, value: ["u/n1/a.webp"] };

      beforeEach(() => {
        mockSession(true);
        vi.mocked(service.getNotesService).mockResolvedValue([
          {
            id: "n1",
            title: "N",
            contentList: [TEXT, REMOTE_IMAGE],
            createdAt: null,
            updatedAt: null,
          },
        ]);
        vi.mocked(service.updateNoteService).mockImplementation(
          async (id, payload) => ({
            id,
            userId: "u",
            title: payload.title ?? "",
            contentList: payload.contentList ?? [],
            createdAt: null,
            updatedAt: null,
          }),
        );
      });

      it("sube al almacenamiento remoto y guarda la nota en la API", async () => {
        remoteStore.save.mockResolvedValueOnce("u/n1/b.webp");
        const { result } = await openNote();

        await act(() => result.current.addImageThinking([blob("b")], "pie"));
        await flush();

        expect(remoteStore.save).toHaveBeenCalledWith(expect.any(Blob), {
          noteId: "n1",
        });
        expect(localStore.save).not.toHaveBeenCalled();
        expect(service.updateNoteService).toHaveBeenCalledWith("n1", {
          title: "N",
          contentList: [
            TEXT,
            REMOTE_IMAGE,
            {
              id: expect.any(String),
              type: "image",
              value: ["u/n1/b.webp"],
              text: "pie",
            },
          ],
        });
      });

      it("si la subida falla la nota no cambia", async () => {
        remoteStore.save.mockRejectedValue(new ImageStoreError("network"));
        const { result } = await openNote();

        await expect(
          act(() => result.current.addImageThinking([blob("b")], "")),
        ).rejects.toMatchObject({ code: "network" });
        expect(service.updateNoteService).not.toHaveBeenCalled();
        expect(result.current.activeNoteState?.thinkings).toHaveLength(2);
      });

      it("al abrir una nota limpia su carpeta remota", async () => {
        await openNote();
        expect(remoteStore.listForNote).toHaveBeenCalledWith("n1");
      });

      it("al borrar la nota borra su carpeta y sus imágenes remotas", async () => {
        vi.mocked(service.deleteNoteService).mockResolvedValue({ id: "n1" });
        const { result } = await openNote();

        await act(() => result.current.deleteNote("n1"));
        await flush();

        expect(remoteStore.removeNoteFolder).toHaveBeenCalledWith("n1");
        expect(remoteStore.remove).toHaveBeenCalledWith(["u/n1/a.webp"]);
        expect(getPendingImageDeletions()).toEqual([]);
      });

      it("si la API no borra la nota, no borra sus imágenes", async () => {
        vi.mocked(service.deleteNoteService).mockRejectedValue(new Error("500"));
        const { result } = await openNote();

        await act(() => result.current.deleteNote("n1"));
        await flush();

        expect(remoteStore.removeNoteFolder).not.toHaveBeenCalled();
        expect(remoteStore.remove).not.toHaveBeenCalled();
      });
    });
  });
  describe("pegar imágenes en el editor", () => {
    const clipboard = (files: File[], types: string[] = []) => ({
      files,
      items: [],
      types,
    });
    const png = (name: string) =>
      new File([name], `${name}.png`, { type: "image/png" });

    beforeEach(() => {
      mockSession(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([SAVED_NOTE]));
      compressImage.mockImplementation(async (file: File) => ({
        blob: new Blob([file.name], { type: "image/webp" }),
        width: 10,
        height: 10,
      }));
      vi.stubGlobal("URL", {
        ...URL,
        createObjectURL: vi.fn(() => "blob:preview"),
        revokeObjectURL: vi.fn(),
      });
    });

    afterEach(() => {
      __resetPendingImagesForTests();
      vi.unstubAllGlobals();
      compressImage.mockReset();
      localStore.save.mockReset();
    });

    it("las imágenes sin enviar se conservan al cambiar de nota y volver", async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([SAVED_NOTE, { id: "n2", title: "Otra", thinkings: [] }]),
      );
      const Switcher = () => {
        const { setActiveNote, closeActiveNote, activeNoteState } = useNotes();
        return (
          <>
            <button onClick={() => setActiveNote("n1")}>nota 1</button>
            <button onClick={() => setActiveNote("n2")}>nota 2</button>
            <button onClick={closeActiveNote}>cerrar</button>
            {activeNoteState && <ActiveNoteView />}
          </>
        );
      };
      render(
        <NotesProvider>
          <Switcher />
        </NotesProvider>,
      );
      await flush();
      fireEvent.click(screen.getByText("nota 1"));
      const input = screen.getByLabelText("Nueva idea");
      fireEvent.change(input, { target: { value: "borrador" } });
      fireEvent.paste(input, { clipboardData: clipboard([png("a")]) });
      await flush();
      expect(screen.getByLabelText("Quitar imagen 1")).toBeTruthy();

      fireEvent.click(screen.getByText("nota 2"));
      expect(screen.queryByLabelText("Quitar imagen 1")).toBeNull();

      fireEvent.click(screen.getByText("nota 1"));
      expect(screen.getByLabelText("Quitar imagen 1")).toBeTruthy();
      expect(screen.getByDisplayValue("borrador")).toBeTruthy();

      // También al cerrar la nota y volver a abrirla
      fireEvent.click(screen.getByText("cerrar"));
      fireEvent.click(screen.getByText("nota 1"));
      expect(screen.getByLabelText("Quitar imagen 1")).toBeTruthy();
    });

    it("muestra la vista previa y al enviar crea un pensamiento con imágenes y texto", async () => {
      localStore.save
        .mockResolvedValueOnce("local:a")
        .mockResolvedValueOnce("local:b");
      localStore.getUrls.mockImplementation(
        async (refs: string[]) => new Map(refs.map((r) => [r, `blob:${r}`])),
      );
      await renderEditor();
      const input = screen.getByLabelText("Nueva idea");

      const notPrevented = fireEvent.paste(input, {
        clipboardData: clipboard([png("a"), png("b")]),
      });
      await flush();

      expect(notPrevented).toBe(false);
      expect(screen.getByLabelText("Quitar imagen 1")).toBeTruthy();
      expect(screen.getByLabelText("Quitar imagen 2")).toBeTruthy();

      fireEvent.change(input, { target: { value: "captura" } });
      fireEvent.keyDown(input, { key: "Enter" });
      await flush();
      await flush();

      expect(screen.queryByLabelText("Quitar imagen 1")).toBeNull();
      const thumb = screen.getByLabelText("Ver imagen 1 de 2");
      const caption = screen.getByText("captura");
      // Se reutiliza el blob de la vista previa: no hace falta pedir la URL
      const img = thumb.querySelector("img")!;
      expect(img.getAttribute("src")).toBe("blob:preview");
      // El placeholder ocupa el lugar hasta que la imagen termina de cargar
      expect(thumb.querySelector(".image-thumb-placeholder")).toBeTruthy();
      fireEvent.load(img);
      expect(thumb.querySelector(".image-thumb-placeholder")).toBeNull();
      expect(thumb.querySelector(".image-thumb-frame.is-loaded")).toBeTruthy();
      // Primero el texto y después las imágenes
      expect(
        caption.compareDocumentPosition(thumb) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0];
      expect(saved.thinkings[1]).toMatchObject({
        type: "image",
        value: ["local:a", "local:b"],
        text: "captura",
      });
    });

    it("pegar solo texto no muestra vista previa", async () => {
      await renderEditor();
      const input = screen.getByLabelText("Nueva idea");

      const notPrevented = fireEvent.paste(input, {
        clipboardData: clipboard([], ["text/plain"]),
      });

      expect(notPrevented).toBe(true);
      expect(compressImage).not.toHaveBeenCalled();
      expect(screen.queryByLabelText("Imágenes a adjuntar")).toBeNull();
    });

    it("si falla la subida muestra el error y conserva la vista previa", async () => {
      localStore.save.mockRejectedValue(new ImageStoreError("quota"));
      await renderEditor();
      const input = screen.getByLabelText("Nueva idea");

      fireEvent.paste(input, { clipboardData: clipboard([png("a")]) });
      await flush();
      fireEvent.keyDown(input, { key: "Enter" });
      await flush();

      expect(screen.getByRole("alert").textContent).toMatch(
        /espacio suficiente/,
      );
      expect(screen.getByLabelText("Quitar imagen 1")).toBeTruthy();
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0];
      expect(saved.thinkings).toHaveLength(1);
    });

    it("pegar un archivo que no es imagen avisa", async () => {
      await renderEditor();
      const input = screen.getByLabelText("Nueva idea");

      fireEvent.paste(input, {
        clipboardData: clipboard([
          new File(["%PDF"], "doc.pdf", { type: "application/pdf" }),
        ]),
      });

      expect(screen.getByRole("alert").textContent).toBe(
        "Solo se pueden pegar imágenes.",
      );
    });
  });
  describe("scroll de la lista de ideas", () => {
    let scrollTopSet: ReturnType<typeof vi.fn<(value: number) => void>>;
    const descriptors = {
      scrollHeight: Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        "scrollHeight",
      ),
      scrollTop: Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        "scrollTop",
      ),
      clientHeight: Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        "clientHeight",
      ),
    };

    beforeEach(() => {
      mockSession(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([SAVED_NOTE]));
      scrollTopSet = vi.fn<(value: number) => void>();
      // jsdom no calcula layout: se simula una lista más alta que su caja
      Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
        configurable: true,
        get: () => 900,
      });
      Object.defineProperty(HTMLElement.prototype, "clientHeight", {
        configurable: true,
        get: () => 300,
      });
      Object.defineProperty(HTMLElement.prototype, "scrollTop", {
        configurable: true,
        get: () => 0,
        set: scrollTopSet,
      });
    });

    afterEach(() => {
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (descriptor) {
          Object.defineProperty(HTMLElement.prototype, key, descriptor);
        } else {
          delete (HTMLElement.prototype as unknown as Record<string, unknown>)[
            key
          ];
        }
      }
    });

    const listScrolls = () =>
      scrollTopSet.mock.contexts.filter(
        (el) => (el as HTMLElement).classList?.contains("thinkings-container"),
      ).length;

    it("al agregar una idea lleva la lista al final", async () => {
      await renderEditor();
      expect(listScrolls()).toBe(0);

      const input = screen.getByLabelText("Nueva idea");
      fireEvent.change(input, { target: { value: "nueva idea" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(listScrolls()).toBe(1);
      expect(scrollTopSet).toHaveBeenLastCalledWith(900);
    });

    it("no se mueve al borrar una idea", async () => {
      await renderEditor();

      fireEvent.click(screen.getByTitle("Borrar"));

      expect(listScrolls()).toBe(0);
    });
  });
  describe("sonidos de crear y borrar nota", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <NotesProvider>{children}</NotesProvider>
    );
    const renderNotes = async () => {
      const hook = renderHook(() => useNotes(), { wrapper });
      await flush();
      return hook;
    };
    const soundCalls = () => playSoundMock.mock.calls.map(([id]) => id);

    beforeEach(() => {
      playSoundMock.mockClear();
      vi.mocked(service.createNoteService).mockReset();
      vi.mocked(service.deleteNoteService).mockReset();
    });

    describe("offline", () => {
      beforeEach(() => {
        mockSession(false);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([SAVED_NOTE]));
      });

      it("cargar las notas no suena", async () => {
        await renderNotes();
        expect(playSoundMock).not.toHaveBeenCalled();
      });

      it("crear una nota suena una vez", async () => {
        const { result } = await renderNotes();
        await act(async () => {
          result.current.addNote();
        });
        expect(soundCalls()).toEqual(["create"]);
      });

      it("borrar una nota suena una vez", async () => {
        const { result } = await renderNotes();
        await act(async () => {
          result.current.deleteNote("n1");
        });
        expect(soundCalls()).toEqual(["remove"]);
      });
    });

    describe("online", () => {
      beforeEach(() => {
        mockSession(true);
        vi.mocked(service.getNotesService).mockResolvedValue([
          {
            id: "n1",
            title: "Idea",
            contentList: [THINKING_A],
            createdAt: null,
            updatedAt: null,
          },
        ]);
      });

      it("cargar las notas no suena", async () => {
        await renderNotes();
        expect(playSoundMock).not.toHaveBeenCalled();
      });

      it("crear una nota suena cuando la API responde", async () => {
        vi.mocked(service.createNoteService).mockResolvedValue({
          id: "n2",
          createdAt: null,
          updatedAt: null,
        } as Awaited<ReturnType<typeof service.createNoteService>>);
        const { result } = await renderNotes();
        await act(async () => {
          result.current.addNote();
        });
        await flush();
        expect(soundCalls()).toEqual(["create"]);
      });

      it("si la API no crea la nota, no suena", async () => {
        vi.mocked(service.createNoteService).mockRejectedValue(new Error("500"));
        const { result } = await renderNotes();
        await act(async () => {
          result.current.addNote();
        });
        await flush();
        expect(playSoundMock).not.toHaveBeenCalled();
      });

      it("borrar una nota suena cuando la API responde", async () => {
        vi.mocked(service.deleteNoteService).mockResolvedValue({ id: "n1" });
        const { result } = await renderNotes();
        await act(async () => {
          result.current.deleteNote("n1");
        });
        await flush();
        expect(soundCalls()).toEqual(["remove"]);
      });

      it("si la API no borra la nota, no suena", async () => {
        vi.mocked(service.deleteNoteService).mockRejectedValue(new Error("500"));
        const { result } = await renderNotes();
        await act(async () => {
          result.current.deleteNote("n1");
        });
        await flush();
        expect(playSoundMock).not.toHaveBeenCalled();
      });
    });
  });
});
