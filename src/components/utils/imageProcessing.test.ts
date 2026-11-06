import { describe, expect, it } from "vitest";
import {
  chooseFallbackFormat,
  computeTargetSize,
  extensionForType,
  extractImageFiles,
  hasClipboardText,
  IMAGE_ERRORS,
  MAX_INPUT_BYTES,
  validateInputFile,
} from "./imageProcessing";

const file = (name: string, type: string, size = 10) =>
  new File([new Uint8Array(size)], name, { type });

// DataTransfer mínimo: jsdom no lo implementa
const clipboard = ({
  files = [] as File[],
  items = [] as File[],
  types = [] as string[],
}) =>
  ({
    files: files as unknown as FileList,
    items: items.map((f) => ({
      kind: "file",
      type: f.type,
      getAsFile: () => f,
    })) as unknown as DataTransferItemList,
    types,
  }) as Pick<DataTransfer, "files" | "items" | "types">;

describe("extractImageFiles", () => {
  it("devuelve las imágenes en orden y separa los otros archivos", () => {
    const a = file("a.png", "image/png");
    const pdf = file("doc.pdf", "application/pdf");
    const b = file("b.jpg", "image/jpeg");

    expect(extractImageFiles(clipboard({ files: [a, pdf, b] }))).toEqual({
      images: [a, b],
      otherFiles: [pdf],
    });
  });

  it("usa items como respaldo si files viene vacío", () => {
    const a = file("a.png", "image/png");
    expect(extractImageFiles(clipboard({ items: [a] })).images).toEqual([a]);
  });

  it("no devuelve nada si solo hay texto", () => {
    const data = clipboard({ types: ["text/plain", "text/html"] });
    expect(extractImageFiles(data)).toEqual({ images: [], otherFiles: [] });
    expect(hasClipboardText(data)).toBe(true);
    expect(extractImageFiles(null)).toEqual({ images: [], otherFiles: [] });
  });
});

describe("computeTargetSize", () => {
  it("reduce para que el lado mayor sea 1600", () => {
    expect(computeTargetSize(3200, 1800, 1600)).toEqual({
      width: 1600,
      height: 900,
    });
    expect(computeTargetSize(1000, 3000, 1600)).toEqual({
      width: 533,
      height: 1600,
    });
  });

  it("nunca agranda", () => {
    expect(computeTargetSize(200, 200, 1600)).toEqual({
      width: 200,
      height: 200,
    });
  });
});

describe("chooseFallbackFormat", () => {
  it("usa PNG para PNG livianos y JPEG en el resto", () => {
    expect(chooseFallbackFormat("image/png", 500_000)).toBe("image/png");
    expect(chooseFallbackFormat("image/png", 5_000_000)).toBe("image/jpeg");
    expect(chooseFallbackFormat("image/jpeg", 100)).toBe("image/jpeg");
  });
});

describe("validateInputFile", () => {
  it("rechaza lo que no es imagen y lo que pasa de 20 MB", () => {
    expect(validateInputFile(file("a.txt", "text/plain"))).toBe(
      IMAGE_ERRORS.notImage,
    );
    expect(
      validateInputFile(file("big.png", "image/png", MAX_INPUT_BYTES + 1)),
    ).toBe(IMAGE_ERRORS.inputTooLarge);
    expect(validateInputFile(file("ok.png", "image/png"))).toBeNull();
  });
});

describe("extensionForType", () => {
  it("elige la extensión según el tipo", () => {
    expect(extensionForType("image/webp")).toBe("webp");
    expect(extensionForType("image/png")).toBe("png");
    expect(extensionForType("image/jpeg")).toBe("jpg");
  });
});
