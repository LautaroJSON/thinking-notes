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
import { NotesProvider } from "./notesContext";

const { getSession, onAuthStateChange } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("../../lib/supabaseClient", () => ({
  supabase: { auth: { getSession, onAuthStateChange } },
}));

vi.mock("../services/service", () => ({
  getNotesService: vi.fn(),
  createNoteService: vi.fn(),
  updateNoteService: vi.fn(),
  deleteNoteService: vi.fn(),
  reorderNotesService: vi.fn(),
}));

import * as service from "../services/service";

const SAVED_NOTE = { id: "n1", title: "Idea", thinkings: ["a"] };

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
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
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
        { ...SAVED_NOTE, title: "Idea editada" },
      ]);
      expect(service.updateNoteService).not.toHaveBeenCalled();
    });

    it("online: llama a la API una sola vez y no entra en loop", async () => {
      mockSession(true);
      vi.mocked(service.getNotesService).mockResolvedValue([
        { id: "n1", title: "Idea", contentList: ["a"] },
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
            createdAt: "",
            updatedAt: "",
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
        contentList: ["a"],
      });
      expect(screen.getByDisplayValue("Idea editada")).toBeTruthy();
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
});
