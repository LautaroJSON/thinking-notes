import { describe, expect, it } from "vitest";
import { formatNoteForCopy } from "./copyNote";

describe("formatNoteForCopy", () => {
  it("incluye el título y cada nota en su propia línea", () => {
    expect(
      formatNoteForCopy({ title: "Ideas", thinkings: ["uno", "dos"] }),
    ).toBe("Título: Ideas\n\nNotas:\nuno\ndos");
  });

  it("usa 'Sin título' si el título está vacío", () => {
    expect(formatNoteForCopy({ title: "  ", thinkings: ["a"] })).toBe(
      "Título: Sin título\n\nNotas:\na",
    );
  });

  it("omite notas vacías y funciona sin notas", () => {
    expect(formatNoteForCopy({ title: "T", thinkings: [" ", ""] })).toBe(
      "Título: T\n\nNotas:",
    );
  });
});
