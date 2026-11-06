import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { compressImage } = vi.hoisted(() => ({ compressImage: vi.fn() }));

vi.mock("@/components/utils/imageProcessing", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/utils/imageProcessing")>();
  return { ...actual, compressImage };
});

import {
  IMAGE_ERRORS,
  ImageProcessingError,
} from "@/components/utils/imageProcessing";
import { usePendingImages } from "./usePendingImages";

const file = (name: string) => new File(["x"], name, { type: "image/png" });

// Deja que terminen las compresiones en curso
const settle = () => act(async () => {});

describe("usePendingImages", () => {
  let urlCount = 0;

  beforeEach(() => {
    urlCount = 0;
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => `blob:${++urlCount}`),
      revokeObjectURL: vi.fn(),
    });
    compressImage.mockImplementation(async (f: File) => ({
      blob: new Blob([f.name], { type: "image/webp" }),
      width: 10,
      height: 10,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    compressImage.mockReset();
  });

  it("agrega las imágenes comprimidas en el orden pegado", async () => {
    const { result } = renderHook(() => usePendingImages());

    act(() => result.current.addFiles([file("a"), file("b")]));
    expect(result.current.isProcessing).toBe(true);
    expect(result.current.images.map((i) => i.status)).toEqual([
      "processing",
      "processing",
    ]);

    await settle();

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.images.map((i) => i.previewUrl)).toEqual([
      "blob:1",
      "blob:2",
    ]);
    expect(
      await Promise.all(result.current.readyBlobs.map((b) => b.text())),
    ).toEqual(["a", "b"]);
  });

  it("respeta el máximo de 5 y avisa al superarlo", async () => {
    const { result } = renderHook(() => usePendingImages());

    act(() => result.current.addFiles(["1", "2", "3", "4"].map(file)));
    act(() => result.current.addFiles([file("5"), file("6")]));
    await settle();

    expect(result.current.images).toHaveLength(5);
    expect(result.current.error).toBe(IMAGE_ERRORS.tooMany);

    act(() => result.current.addFiles([file("7")]));
    expect(result.current.images).toHaveLength(5);
  });

  it("quita una sola imagen y revoca su URL", async () => {
    const { result } = renderHook(() => usePendingImages());
    act(() => result.current.addFiles([file("a"), file("b")]));
    await settle();
    const [first] = result.current.images;

    act(() => result.current.remove(first.localId));

    expect(result.current.images.map((i) => i.previewUrl)).toEqual(["blob:2"]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:1");
  });

  it("clear vacía la bandeja y revoca todas las URLs", async () => {
    const { result } = renderHook(() => usePendingImages());
    act(() => result.current.addFiles([file("a"), file("b")]));
    await settle();

    act(() => result.current.clear());

    expect(result.current.images).toEqual([]);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    // Se puede volver a llenar hasta 5
    act(() => result.current.addFiles(["1", "2", "3", "4", "5"].map(file)));
    expect(result.current.images).toHaveLength(5);
  });

  it("rechaza solo la imagen que falla y muestra su error", async () => {
    compressImage.mockImplementation(async (f: File) => {
      if (f.name === "grande") {
        throw new ImageProcessingError(IMAGE_ERRORS.outputTooLarge);
      }
      return { blob: new Blob([f.name]), width: 1, height: 1 };
    });
    const { result } = renderHook(() => usePendingImages());

    act(() => result.current.addFiles([file("a"), file("grande")]));
    await settle();

    expect(result.current.images).toHaveLength(1);
    expect(result.current.error).toBe(IMAGE_ERRORS.outputTooLarge);
  });

  it("descarta el resultado si se vació la bandeja mientras comprimía", async () => {
    let finish!: () => void;
    compressImage.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ blob: new Blob(["x"]), width: 1, height: 1 });
        }),
    );
    const { result } = renderHook(() => usePendingImages());

    act(() => result.current.addFiles([file("a")]));
    act(() => result.current.clear());
    finish();
    await settle();

    expect(result.current.images).toEqual([]);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("revoca las URLs al desmontar", async () => {
    const { result, unmount } = renderHook(() => usePendingImages());
    act(() => result.current.addFiles([file("a")]));
    await settle();

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:1");
  });
});
