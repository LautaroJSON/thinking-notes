import { describe, expect, it } from "vitest";
import { noteToMarkdown, toFileName } from "./exportNote";

describe("noteToMarkdown", () => {
  it("usa el título como encabezado y las ideas como lista", () => {
    expect(noteToMarkdown({ title: "Ideas", thinkings: ["uno", "dos"] })).toBe(
      "# Ideas\n\n- uno\n- dos\n",
    );
  });

  it("indenta las ideas de varias líneas y omite las vacías", () => {
    expect(
      noteToMarkdown({ title: "T", thinkings: ["a\nb", "  "] }),
    ).toBe("# T\n\n- a\n  b\n");
  });

  it("usa 'Sin título' y funciona sin ideas", () => {
    expect(noteToMarkdown({ title: " ", thinkings: [] })).toBe(
      "# Sin título\n",
    );
  });
});

describe("toFileName", () => {
  it("quita caracteres inválidos y conserva acentos", () => {
    expect(toFileName('Plan: año 2026 / "v2"?', "md")).toBe(
      "Plan año 2026 v2.md",
    );
  });

  it("usa 'nota' si el título queda vacío", () => {
    expect(toFileName("  ", "pdf")).toBe("nota.pdf");
  });
});
