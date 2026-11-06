import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Thinking } from "@/types";
import { downloadNoteAsPdf, noteToMarkdown, toFileName } from "./exportNote";

const text = (value: string, id = value): Thinking => ({
  id,
  type: "text",
  value,
});

describe("noteToMarkdown", () => {
  it("usa el título como encabezado y las ideas como lista", () => {
    expect(
      noteToMarkdown({ title: "Ideas", thinkings: [text("uno"), text("dos")] }),
    ).toBe("# Ideas\n\n- uno\n- dos\n");
  });

  it("indenta las ideas de varias líneas y omite las vacías", () => {
    expect(
      noteToMarkdown({ title: "T", thinkings: [text("a\nb"), text("  ")] }),
    ).toBe("# T\n\n- a\n  b\n");
  });

  it("usa 'Sin título' y funciona sin ideas", () => {
    expect(noteToMarkdown({ title: " ", thinkings: [] })).toBe(
      "# Sin título\n",
    );
  });

  it("representa las imágenes con [Imagen] después de su texto", () => {
    expect(
      noteToMarkdown({
        title: "T",
        thinkings: [
          { id: "i1", type: "image", value: ["local:a"] },
          { id: "i2", type: "image", value: ["local:b", "local:c"], text: "pie" },
        ],
      }),
    ).toBe("# T\n\n- [Imagen]\n- pie [Imagen] [Imagen]\n");
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

const { docMock } = vi.hoisted(() => {
  const docMock = {
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    text: vi.fn(),
    addImage: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
  };
  return { docMock };
});

vi.mock("jspdf", () => ({
  jsPDF: vi.fn(function () {
    return docMock;
  }),
}));

describe("downloadNoteAsPdf", () => {
  const toJpeg = vi.fn(async () => ({
    dataUrl: "data:image/jpeg;base64,xx",
    width: 1600,
    height: 900,
  }));

  beforeEach(() => {
    Object.values(docMock).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) fn.mockClear();
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  const writtenTexts = () =>
    docMock.text.mock.calls.map((call) => call[0] as string);

  it("escribe primero el texto y después cada imagen al ancho útil", async () => {
    const getImageBlob = vi.fn(async (_ref: string) => new Blob([_ref]));

    await downloadNoteAsPdf(
      {
        title: "T",
        thinkings: [
          { id: "t", type: "text", value: "antes" },
          { id: "i", type: "image", value: ["local:a", "local:b"], text: "pie" },
        ],
      },
      { getImageBlob, toJpeg },
    );

    expect(getImageBlob.mock.calls.map((c) => c[0])).toEqual([
      "local:a",
      "local:b",
    ]);
    expect(docMock.addImage).toHaveBeenCalledTimes(2);
    const [, format, x, , width, height] = docMock.addImage.mock.calls[0];
    expect(format).toBe("JPEG");
    expect(x).toBe(25);
    expect(width).toBe(165);
    expect(height).toBeCloseTo(165 * (900 / 1600));
    expect(writtenTexts()).toEqual(["T", "•", "antes", "•", "pie"]);
    // El texto que acompaña va antes que las imágenes
    const pieCall = docMock.text.mock.calls.findIndex((c) => c[0] === "pie");
    expect(docMock.text.mock.invocationCallOrder[pieCall]).toBeLessThan(
      docMock.addImage.mock.invocationCallOrder[0],
    );
    expect(docMock.save).toHaveBeenCalledWith("T.pdf");
  });

  it("pasa de página cuando la imagen no entra", async () => {
    await downloadNoteAsPdf(
      {
        title: "T",
        thinkings: [
          { id: "i", type: "image", value: ["local:a", "local:b", "local:c"] },
        ],
      },
      { getImageBlob: async () => new Blob(["x"]), toJpeg },
    );
    expect(docMock.addPage).toHaveBeenCalled();
  });

  it("escala las imágenes más altas que la página", async () => {
    await downloadNoteAsPdf(
      { title: "T", thinkings: [{ id: "i", type: "image", value: ["local:a"] }] },
      {
        getImageBlob: async () => new Blob(["x"]),
        toJpeg: async () => ({ dataUrl: "d", width: 100, height: 1000 }),
      },
    );
    const [, , , , width, height] = docMock.addImage.mock.calls[0];
    expect(height).toBe(257);
    expect(width).toBeCloseTo(25.7);
  });

  it("si una imagen no se puede obtener escribe [Imagen no disponible] y sigue", async () => {
    const getImageBlob = vi
      .fn()
      .mockRejectedValueOnce(new Error("404"))
      .mockResolvedValueOnce(new Blob(["x"]));

    await downloadNoteAsPdf(
      {
        title: "T",
        thinkings: [
          { id: "i", type: "image", value: ["local:a", "local:b"] },
          { id: "x", type: "audio" },
        ],
      },
      { getImageBlob, toJpeg },
    );

    expect(writtenTexts()).toContain("[Imagen no disponible]");
    expect(docMock.addImage).toHaveBeenCalledTimes(1);
    expect(docMock.save).toHaveBeenCalled();
  });
});
