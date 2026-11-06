import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageStoreError } from "./errors";
import {
  __resetLocalImageStoreForTests,
  localImageStore,
} from "./localImageStore";

const blob = (text: string, type = "image/webp") =>
  new Blob([text], { type });

const deleteDb = () =>
  new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("thinking-notes-images");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });

describe("localImageStore", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => `blob:${Math.random()}`),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(async () => {
    await __resetLocalImageStoreForTests();
    await deleteDb();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("guarda y devuelve el mismo contenido con una referencia local", async () => {
    const ref = await localImageStore.save(blob("hola"), { noteId: "n1" });

    expect(ref).toMatch(/^local:[0-9a-f-]{36}$/);
    const stored = await localImageStore.getBlob(ref);
    expect(stored.type).toBe("image/webp");
    expect(await stored.text()).toBe("hola");
  });

  it("lista las imágenes con su fecha de alta", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    const a = await localImageStore.save(blob("a"), { noteId: "n1" });
    const b = await localImageStore.save(blob("b"), { noteId: "n1" });

    const all = await localImageStore.listAll();
    expect(all).toHaveLength(2);
    expect(all).toEqual(
      expect.arrayContaining([
        { ref: a, createdAt: 1000 },
        { ref: b, createdAt: 1000 },
      ]),
    );
  });

  it("borra y no falla si la imagen no existe", async () => {
    const ref = await localImageStore.save(blob("a"), { noteId: "n1" });
    await localImageStore.getUrls([ref]);

    await localImageStore.remove([ref, "local:no-existe"]);

    await expect(localImageStore.getBlob(ref)).rejects.toMatchObject({
      code: "not-found",
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(await localImageStore.listAll()).toEqual([]);
  });

  it("getUrls reutiliza las URLs creadas y omite las inexistentes", async () => {
    const ref = await localImageStore.save(blob("a"), { noteId: "n1" });

    const first = await localImageStore.getUrls([ref, "local:no-existe"]);
    const second = await localImageStore.getUrls([ref]);

    expect(first.size).toBe(1);
    expect(second.get(ref)).toBe(first.get(ref));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("convierte un error de cuota en ImageStoreError('quota')", async () => {
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("lleno", "QuotaExceededError");
    });

    const error = await localImageStore
      .save(blob("a"), { noteId: "n1" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ImageStoreError);
    expect(error).toMatchObject({ code: "quota" });
    expect((error as Error).message).toMatch(/espacio suficiente/);
  });
});
