import { describe, expect, it } from "vitest";
import type { Thinking } from "@/types";
import { formatNoteForCopy, thinkingToPlainText } from "./copyNote";

const text = (value: string, id = value): Thinking => ({
  id,
  type: "text",
  value,
});

describe("formatNoteForCopy", () => {
  it("incluye el título y cada nota en su propia línea", () => {
    expect(
      formatNoteForCopy({ title: "Ideas", thinkings: [text("uno"), text("dos")] }),
    ).toBe("Título: Ideas\n\nNotas:\nuno\ndos");
  });

  it("usa 'Sin título' si el título está vacío", () => {
    expect(formatNoteForCopy({ title: "  ", thinkings: [text("a")] })).toBe(
      "Título: Sin título\n\nNotas:\na",
    );
  });

  it("omite notas vacías y funciona sin notas", () => {
    expect(
      formatNoteForCopy({ title: "T", thinkings: [text(" ", "1"), text("", "2")] }),
    ).toBe("Título: T\n\nNotas:");
  });

  it("representa las imágenes con [Imagen] en su posición", () => {
    expect(
      formatNoteForCopy({
        title: "T",
        thinkings: [
          text("antes"),
          { id: "i1", type: "image", value: ["local:a"] },
          {
            id: "i2",
            type: "image",
            value: ["local:b", "local:c"],
            text: "captura del error",
          },
          { id: "x", type: "audio" },
        ],
      }),
    ).toBe(
      "Título: T\n\nNotas:\nantes\n[Imagen]\ncaptura del error [Imagen] [Imagen]",
    );
  });
});

describe("thinkingToPlainText", () => {
  it("devuelve vacío para tipos desconocidos", () => {
    expect(thinkingToPlainText({ id: "x", type: "audio" })).toBe("");
  });
});
