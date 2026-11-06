import { v4 as uuidv4 } from "uuid";
import {
  fromLocalRef,
  isLocalRef,
  toLocalRef,
  type ImageRef,
} from "@/types/thinking";
import { ImageStoreError, toImageStoreError } from "./errors";
import type { ImageStore, StoredImageInfo } from "./types";

// Imágenes del modo sin sesión en IndexedDB (research R3). Se guarda el
// contenido como ArrayBuffer + tipo en lugar del Blob: es más portable entre
// navegadores (Safari tuvo problemas guardando Blobs) y entre entornos de test.
const DB_NAME = "thinking-notes-images";
const DB_VERSION = 1;
const STORE_NAME = "images";

interface ImageRecord {
  data: ArrayBuffer;
  type: string;
  createdAt: number;
}

// Sin `instanceof`: el ArrayBuffer clonado puede venir de otro realm
const isArrayBuffer = (v: unknown): v is ArrayBuffer =>
  Object.prototype.toString.call(v) === "[object ArrayBuffer]";

const isImageRecord = (v: unknown): v is ImageRecord =>
  typeof v === "object" &&
  v !== null &&
  "data" in v &&
  isArrayBuffer(v.data) &&
  "type" in v &&
  typeof v.type === "string" &&
  "createdAt" in v &&
  typeof v.createdAt === "number";

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((error: unknown) => {
    // Permite reintentar si falló la apertura
    dbPromise = null;
    throw error;
  });
  return dbPromise;
};

// Ejecuta `fn` en una transacción y resuelve cuando la transacción termina
// (no antes): así una falla de cuota al confirmar también se reporta.
const withStore = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    let result: T;
    try {
      const tx = db.transaction(STORE_NAME, mode);
      const request = fn(tx.objectStore(STORE_NAME));
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? request.error);
      tx.onabort = () => reject(tx.error ?? request.error);
    } catch (error) {
      reject(error);
    }
  });
};

// Object URLs ya creadas en esta sesión, para no duplicarlas
const urlCache = new Map<ImageRef, string>();

const keyOf = (ref: ImageRef) => {
  if (!isLocalRef(ref)) throw new ImageStoreError("not-found");
  return fromLocalRef(ref);
};

const readRecord = async (ref: ImageRef): Promise<ImageRecord> => {
  const record: unknown = await withStore("readonly", (store) =>
    store.get(keyOf(ref)),
  );
  if (!isImageRecord(record)) throw new ImageStoreError("not-found");
  return record;
};

export const localImageStore: ImageStore & {
  listAll(): Promise<StoredImageInfo[]>;
} = {
  async save(blob) {
    const key = uuidv4();
    try {
      const record: ImageRecord = {
        data: await blob.arrayBuffer(),
        type: blob.type,
        createdAt: Date.now(),
      };
      await withStore("readwrite", (store) => store.put(record, key));
    } catch (error) {
      throw toImageStoreError(error);
    }
    return toLocalRef(key);
  },

  async getBlob(ref) {
    const record = await readRecord(ref);
    return new Blob([record.data], { type: record.type });
  },

  async getUrls(refs) {
    const urls = new Map<ImageRef, string>();
    await Promise.all(
      refs.map(async (ref) => {
        const cached = urlCache.get(ref);
        if (cached) {
          urls.set(ref, cached);
          return;
        }
        try {
          const url = URL.createObjectURL(await localImageStore.getBlob(ref));
          urlCache.set(ref, url);
          urls.set(ref, url);
        } catch {
          // Las que no existen quedan fuera del Map: la UI muestra
          // "Imagen no disponible"
        }
      }),
    );
    return urls;
  },

  async remove(refs) {
    for (const ref of refs.filter(isLocalRef)) {
      await withStore("readwrite", (store) => store.delete(keyOf(ref)));
      const url = urlCache.get(ref);
      if (url) {
        URL.revokeObjectURL(url);
        urlCache.delete(ref);
      }
    }
  },

  async listAll() {
    const db = await openDb();
    return new Promise<StoredImageInfo[]>((resolve, reject) => {
      const items: StoredImageInfo[] = [];
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const value: unknown = cursor.value;
        items.push({
          ref: toLocalRef(String(cursor.key)),
          createdAt: isImageRecord(value) ? value.createdAt : 0,
        });
        cursor.continue();
      };
      tx.oncomplete = () => resolve(items);
      tx.onerror = () => reject(tx.error);
    });
  },
};

/** Solo para tests: cierra la conexión para poder borrar la base. */
export const __resetLocalImageStoreForTests = async () => {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
  urlCache.clear();
};
