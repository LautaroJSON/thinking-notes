import { afterEach, describe, expect, it, vi } from "vitest";
import { loadNotesFromStorage, STORAGE_KEY } from "./index";

describe("loadNotesFromStorage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("devuelve un array vacío si no hay notas guardadas", () => {
    expect(loadNotesFromStorage()).toEqual([]);
  });

  it("devuelve las notas guardadas en localStorage", () => {
    const notes = [
      {
        id: "1",
        title: "Idea",
        thinkings: [
          { id: "a", type: "text", value: "a" },
          { id: "b", type: "image", value: ["local:x"], text: "b" },
        ],
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    expect(loadNotesFromStorage()).toEqual(notes);
    // Ya estaban en el formato nuevo: no se reescribe nada
    expect(setItem).not.toHaveBeenCalled();
  });

  it("migra los pensamientos del formato anterior y reescribe una sola vez", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: "1", title: "Vieja", thinkings: ["a", "b"] },
        { id: "2", title: "Vacía", thinkings: [] },
      ]),
    );
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    const notes = loadNotesFromStorage();

    expect(notes[0].thinkings).toEqual([
      { id: expect.any(String), type: "text", value: "a" },
      { id: expect.any(String), type: "text", value: "b" },
    ]);
    expect(notes[1].thinkings).toEqual([]);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(notes);

    // Una segunda carga no vuelve a escribir ni cambia los ids
    setItem.mockClear();
    expect(loadNotesFromStorage()).toEqual(notes);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("devuelve un array vacío si el contenido guardado está corrupto", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, "{no es json");

    expect(loadNotesFromStorage()).toEqual([]);
  });
});
