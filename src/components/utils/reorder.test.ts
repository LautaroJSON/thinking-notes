import { describe, expect, it } from "vitest";
import type { INotes } from "@/types";
import { applyOrder, moveNote } from "./reorder";

const note = (id: string): INotes => ({ id, title: id, thinkings: [] });
const ids = (notes: INotes[]) => notes.map((n) => n.id);

describe("moveNote", () => {
  const notes = ["A", "B", "C", "D"].map(note);

  it("mueve una nota hacia arriba", () => {
    expect(ids(moveNote(notes, "D", "A"))).toEqual(["D", "A", "B", "C"]);
  });

  it("mueve una nota hacia abajo", () => {
    expect(ids(moveNote(notes, "A", "C"))).toEqual(["B", "C", "A", "D"]);
  });

  it("devuelve el mismo array si se suelta en la misma posición", () => {
    expect(moveNote(notes, "B", "B")).toBe(notes);
  });

  it("devuelve el mismo array si algún id no existe", () => {
    expect(moveNote(notes, "X", "A")).toBe(notes);
    expect(moveNote(notes, "A", "X")).toBe(notes);
  });

  it("maneja listas vacías y de un elemento", () => {
    const empty: INotes[] = [];
    expect(moveNote(empty, "A", "B")).toBe(empty);
    const single = [note("A")];
    expect(moveNote(single, "A", "A")).toBe(single);
  });

  it("no muta el array original ni pierde o duplica notas", () => {
    const original = [...notes];
    const result = moveNote(notes, "B", "D");
    expect(notes).toEqual(original);
    expect(result).toHaveLength(notes.length);
    expect(new Set(ids(result))).toEqual(new Set(ids(notes)));
    // Conserva las mismas referencias de cada nota
    expect(result).toEqual(expect.arrayContaining(notes));
  });
});

describe("applyOrder", () => {
  it("ordena según los ids conservando el contenido actual", () => {
    const current = [
      { id: "A", title: "A editada", thinkings: [] },
      note("B"),
      note("C"),
    ];
    const result = applyOrder(current, ["C", "A", "B"]);
    expect(ids(result)).toEqual(["C", "A", "B"]);
    expect(result[1].title).toBe("A editada");
  });

  it("deja al final las notas que no están en el orden e ignora ids borrados", () => {
    const current = [note("A"), note("B"), note("N")];
    expect(ids(applyOrder(current, ["B", "X", "A"]))).toEqual(["B", "A", "N"]);
  });
});
