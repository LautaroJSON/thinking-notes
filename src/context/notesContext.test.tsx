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
});
