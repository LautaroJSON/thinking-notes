import { afterEach, describe, expect, it, vi } from "vitest";
import { loadNotesFromStorage, STORAGE_KEY } from "./index";

describe("loadNotesFromStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("devuelve un array vacío si no hay notas guardadas", () => {
    expect(loadNotesFromStorage()).toEqual([]);
  });

  it("devuelve las notas guardadas en localStorage", () => {
    const notes = [{ id: "1", title: "Idea", thinkings: ["a", "b"] }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));

    expect(loadNotesFromStorage()).toEqual(notes);
  });

  it("devuelve un array vacío si el contenido guardado está corrupto", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, "{no es json");

    expect(loadNotesFromStorage()).toEqual([]);
  });
});
