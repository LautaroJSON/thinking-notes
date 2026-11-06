import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, storageApi, from } = vi.hoisted(() => {
  const storageApi = {
    upload: vi.fn(),
    createSignedUrls: vi.fn(),
    download: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
  };
  return {
    getSession: vi.fn(),
    storageApi,
    from: vi.fn(() => storageApi),
  };
});

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { auth: { getSession }, storage: { from } },
}));

import {
  __resetRemoteImageStoreForTests,
  IMAGES_BUCKET,
  remoteImageStore,
} from "./remoteImageStore";

const USER = "user-1";

describe("remoteImageStore", () => {
  beforeEach(() => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: USER } } },
      error: null,
    });
  });

  afterEach(() => {
    __resetRemoteImageStoreForTests();
    Object.values(storageApi).forEach((fn) => fn.mockReset());
    vi.useRealTimers();
  });

  it("sube a <userId>/<noteId>/<uuid>.<ext> sin reemplazar", async () => {
    storageApi.upload.mockResolvedValue({ data: {}, error: null });
    const blob = new Blob(["x"], { type: "image/webp" });

    const ref = await remoteImageStore.save(blob, { noteId: "n1" });

    expect(from).toHaveBeenCalledWith(IMAGES_BUCKET);
    expect(ref).toMatch(/^user-1\/n1\/[0-9a-f-]{36}\.webp$/);
    expect(storageApi.upload).toHaveBeenCalledWith(ref, blob, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "3600",
    });
  });

  it("usa la extensión del formato de respaldo", async () => {
    storageApi.upload.mockResolvedValue({ data: {}, error: null });
    const ref = await remoteImageStore.save(
      new Blob(["x"], { type: "image/jpeg" }),
      { noteId: "n1" },
    );
    expect(ref).toMatch(/\.jpg$/);
  });

  it("convierte un error de subida en un ImageStoreError de red", async () => {
    storageApi.upload.mockResolvedValue({
      data: null,
      error: new Error("Failed to fetch"),
    });

    await expect(
      remoteImageStore.save(new Blob(["x"], { type: "image/webp" }), {
        noteId: "n1",
      }),
    ).rejects.toMatchObject({ code: "network" });
  });

  it("rechaza si no hay sesión", async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(
      remoteImageStore.save(new Blob(["x"]), { noteId: "n1" }),
    ).rejects.toMatchObject({ code: "network" });
    expect(storageApi.upload).not.toHaveBeenCalled();
  });

  it("pide las URLs firmadas en una sola llamada y las reutiliza", async () => {
    vi.useFakeTimers();
    storageApi.createSignedUrls.mockImplementation(async (paths: string[]) => ({
      data: paths.map((path) => ({
        path,
        signedUrl: `https://signed/${path}`,
        error: null,
      })),
      error: null,
    }));

    const first = await remoteImageStore.getUrls(["u/n/a.webp", "u/n/b.webp"]);
    const second = await remoteImageStore.getUrls(["u/n/a.webp"]);

    expect(storageApi.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(storageApi.createSignedUrls).toHaveBeenCalledWith(
      ["u/n/a.webp", "u/n/b.webp"],
      3600,
    );
    expect(first.get("u/n/b.webp")).toBe("https://signed/u/n/b.webp");
    expect(second.get("u/n/a.webp")).toBe("https://signed/u/n/a.webp");

    // Faltando menos de 5 minutos para que venza, se renueva
    vi.advanceTimersByTime(56 * 60 * 1000);
    await remoteImageStore.getUrls(["u/n/a.webp"]);
    expect(storageApi.createSignedUrls).toHaveBeenCalledTimes(2);
  });

  it("omite las URLs que no se pudieron firmar e ignora refs locales", async () => {
    storageApi.createSignedUrls.mockResolvedValue({
      data: [
        { path: "u/n/a.webp", signedUrl: "https://ok", error: null },
        { path: "u/n/x.webp", signedUrl: null, error: "Object not found" },
      ],
      error: null,
    });

    const urls = await remoteImageStore.getUrls([
      "u/n/a.webp",
      "u/n/x.webp",
      "local:abc",
    ]);

    expect([...urls.keys()]).toEqual(["u/n/a.webp"]);
    expect(storageApi.createSignedUrls).toHaveBeenCalledWith(
      ["u/n/a.webp", "u/n/x.webp"],
      3600,
    );
  });

  it("borra las rutas remotas y propaga los errores", async () => {
    storageApi.remove.mockResolvedValueOnce({ data: [], error: null });
    await remoteImageStore.remove(["u/n/a.webp", "local:x"]);
    expect(storageApi.remove).toHaveBeenCalledWith(["u/n/a.webp"]);

    storageApi.remove.mockResolvedValueOnce({
      data: null,
      error: new Error("offline"),
    });
    await expect(remoteImageStore.remove(["u/n/b.webp"])).rejects.toMatchObject(
      { code: "network" },
    );
  });

  it("lista los archivos de la carpeta de una nota", async () => {
    storageApi.list.mockResolvedValue({
      data: [
        { id: "1", name: "a.webp", created_at: "2026-11-06T10:00:00.000Z" },
        { id: null, name: ".emptyFolderPlaceholder", created_at: null },
      ],
      error: null,
    });

    const files = await remoteImageStore.listForNote("n1");

    expect(storageApi.list).toHaveBeenCalledWith("user-1/n1", { limit: 1000 });
    expect(files).toEqual([
      {
        ref: "user-1/n1/a.webp",
        createdAt: Date.parse("2026-11-06T10:00:00.000Z"),
      },
    ]);
  });

  it("removeNoteFolder borra todo lo que hay en la carpeta", async () => {
    storageApi.list.mockResolvedValue({
      data: [
        { id: "1", name: "a.webp", created_at: null },
        { id: "2", name: "b.webp", created_at: null },
      ],
      error: null,
    });
    storageApi.remove.mockResolvedValue({ data: [], error: null });

    await remoteImageStore.removeNoteFolder("n1");

    expect(storageApi.remove).toHaveBeenCalledWith([
      "user-1/n1/a.webp",
      "user-1/n1/b.webp",
    ]);
  });

  it("getBlob devuelve el archivo o not-found", async () => {
    const blob = new Blob(["x"]);
    storageApi.download.mockResolvedValueOnce({ data: blob, error: null });
    await expect(remoteImageStore.getBlob("u/n/a.webp")).resolves.toBe(blob);

    storageApi.download.mockResolvedValueOnce({
      data: null,
      error: new Error("404"),
    });
    await expect(remoteImageStore.getBlob("u/n/a.webp")).rejects.toMatchObject(
      { code: "not-found" },
    );
  });
});
