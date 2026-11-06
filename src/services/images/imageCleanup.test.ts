import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { localStore, remoteStore } = vi.hoisted(() => ({
  localStore: { remove: vi.fn(), listAll: vi.fn() },
  remoteStore: { remove: vi.fn(), listForNote: vi.fn() },
}));

vi.mock("./localImageStore", () => ({ localImageStore: localStore }));
vi.mock("./remoteImageStore", () => ({ remoteImageStore: remoteStore }));

import {
  collectImageRefs,
  enqueueImageDeletions,
  getPendingImageDeletions,
  ORPHAN_GRACE_MS,
  processImageDeletionQueue,
  QUEUE_KEY,
  sweepLocalOrphans,
  sweepRemoteNote,
} from "./imageCleanup";

const none = () => false;

describe("imageCleanup", () => {
  beforeEach(() => {
    localStore.remove.mockResolvedValue(undefined);
    remoteStore.remove.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  describe("cola de borrados pendientes", () => {
    it("persiste sin repetir", () => {
      enqueueImageDeletions(["local:a", "u/n/b.webp"]);
      enqueueImageDeletions(["local:a", "local:c"]);

      expect(getPendingImageDeletions()).toEqual([
        "local:a",
        "u/n/b.webp",
        "local:c",
      ]);
      expect(JSON.parse(localStorage.getItem(QUEUE_KEY)!)).toHaveLength(3);
    });

    it("borra las no referenciadas y las quita de la cola", async () => {
      enqueueImageDeletions(["local:a", "u/n/b.webp"]);

      await processImageDeletionQueue(none, { online: true });

      expect(localStore.remove).toHaveBeenCalledWith(["local:a"]);
      expect(remoteStore.remove).toHaveBeenCalledWith(["u/n/b.webp"]);
      expect(getPendingImageDeletions()).toEqual([]);
      expect(localStorage.getItem(QUEUE_KEY)).toBeNull();
    });

    it("nunca borra una referencia que una nota sigue usando", async () => {
      enqueueImageDeletions(["local:usada", "local:libre"]);

      await processImageDeletionQueue((ref) => ref === "local:usada", {
        online: false,
      });

      expect(localStore.remove).toHaveBeenCalledTimes(1);
      expect(localStore.remove).toHaveBeenCalledWith(["local:libre"]);
      // Queda en la cola por si más adelante deja de usarse
      expect(getPendingImageDeletions()).toEqual(["local:usada"]);
    });

    it("sin sesión no toca las referencias remotas", async () => {
      enqueueImageDeletions(["u/n/b.webp", "local:a"]);

      await processImageDeletionQueue(none, { online: false });

      expect(remoteStore.remove).not.toHaveBeenCalled();
      expect(getPendingImageDeletions()).toEqual(["u/n/b.webp"]);
    });

    it("conserva en la cola las que fallan", async () => {
      remoteStore.remove.mockRejectedValue(new Error("offline"));
      enqueueImageDeletions(["u/n/b.webp", "local:a"]);

      await processImageDeletionQueue(none, { online: true });

      expect(getPendingImageDeletions()).toEqual(["u/n/b.webp"]);
    });

    it("no pierde lo que se encola mientras se procesa", async () => {
      let release!: () => void;
      localStore.remove.mockImplementationOnce(
        () => new Promise<void>((resolve) => (release = resolve)),
      );
      enqueueImageDeletions(["local:a"]);

      const pending = processImageDeletionQueue(none, { online: false });
      await vi.waitFor(() => expect(localStore.remove).toHaveBeenCalled());
      enqueueImageDeletions(["local:nueva"]);
      release();
      await pending;

      expect(getPendingImageDeletions()).toEqual(["local:nueva"]);
    });
  });

  describe("limpieza de respaldo", () => {
    const NOW = 1_000_000_000;
    const old = NOW - ORPHAN_GRACE_MS - 1;
    const recent = NOW - 1000;

    it("borra solo las imágenes locales sin uso y viejas", async () => {
      localStore.listAll.mockResolvedValue([
        { ref: "local:huerfana", createdAt: old },
        { ref: "local:reciente", createdAt: recent },
        { ref: "local:usada", createdAt: old },
      ]);

      await sweepLocalOrphans((ref) => ref === "local:usada", NOW);

      expect(localStore.remove).toHaveBeenCalledTimes(1);
      expect(localStore.remove).toHaveBeenCalledWith(["local:huerfana"]);
    });

    it("borra los archivos remotos de la nota que no se usan", async () => {
      remoteStore.listForNote.mockResolvedValue([
        { ref: "u/n1/a.webp", createdAt: old },
        { ref: "u/n1/b.webp", createdAt: old },
      ]);

      await sweepRemoteNote("n1", (ref) => ref === "u/n1/a.webp", NOW);

      expect(remoteStore.listForNote).toHaveBeenCalledWith("n1");
      expect(remoteStore.remove).toHaveBeenCalledWith(["u/n1/b.webp"]);
    });

    it("los errores de la limpieza no se propagan", async () => {
      remoteStore.listForNote.mockRejectedValue(new Error("offline"));
      await expect(sweepRemoteNote("n1", none, NOW)).resolves.toBeUndefined();
    });
  });

  it("collectImageRefs junta las referencias de todas las notas", () => {
    const refs = collectImageRefs([
      {
        title: "a",
        thinkings: [
          { id: "1", type: "text", value: "x" },
          { id: "2", type: "image", value: ["local:a", "local:b"] },
        ],
      },
      null,
      { title: "b", thinkings: [{ id: "3", type: "image", value: ["u/n/c"] }] },
    ]);
    expect([...refs]).toEqual(["local:a", "local:b", "u/n/c"]);
  });
});
