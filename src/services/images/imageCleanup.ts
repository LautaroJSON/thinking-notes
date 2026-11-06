import type { INotes } from "@/types";
import { getImageRefs, isLocalRef, type ImageRef } from "@/types/thinking";
import { resolveImageStore } from "./imageStore";
import { localImageStore } from "./localImageStore";
import { remoteImageStore } from "./remoteImageStore";

// Limpieza de archivos de imagen para no dejar huérfanos (research R7):
// - una cola persistente de borrados pendientes que se reintenta, y
// - una limpieza de respaldo de archivos que ninguna nota referencia.
// Regla de oro: nunca se borra un archivo que alguna nota sigue usando.

export const QUEUE_KEY = "pendingImageDeletions";
/** Margen para no borrar un archivo recién subido cuya nota aún no se guardó. */
export const ORPHAN_GRACE_MS = 10 * 60 * 1000;

export type IsReferenced = (ref: ImageRef) => boolean;

const readQueue = (): ImageRef[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((ref): ref is string => typeof ref === "string")
      : [];
  } catch {
    return [];
  }
};

const writeQueue = (refs: ImageRef[]) => {
  try {
    if (refs.length === 0) localStorage.removeItem(QUEUE_KEY);
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(refs));
  } catch (error) {
    console.error("No se pudo guardar la cola de imágenes a borrar:", error);
  }
};

export const getPendingImageDeletions = readQueue;

/** Agrega referencias a la cola de borrados pendientes (sin repetir). */
export const enqueueImageDeletions = (refs: ImageRef[]) => {
  if (refs.length === 0) return;
  writeQueue([...new Set([...readQueue(), ...refs])]);
};

/** Todas las referencias de imágenes de un conjunto de notas. */
export const collectImageRefs = (
  notes: (INotes | null | undefined)[],
): Set<ImageRef> => {
  const refs = new Set<ImageRef>();
  for (const note of notes) {
    note?.thinkings.forEach((t) => getImageRefs(t).forEach((r) => refs.add(r)));
  }
  return refs;
};

let processing: Promise<void> | null = null;

/**
 * Intenta borrar las referencias de la cola. Se quitan de la cola las que se
 * borraron; quedan las que fallaron, las remotas sin sesión y las que alguna
 * nota todavía usa (por ejemplo, si falló el guardado de la nota).
 */
export const processImageDeletionQueue = (
  isReferenced: IsReferenced,
  { online }: { online: boolean },
): Promise<void> => {
  // Una sola pasada a la vez; la siguiente espera a la anterior
  const run = async () => {
    const done = new Set<ImageRef>();
    for (const ref of readQueue()) {
      if (isReferenced(ref)) continue;
      if (!isLocalRef(ref) && !online) continue;
      try {
        await resolveImageStore(ref).remove([ref]);
        done.add(ref);
      } catch (error) {
        console.error("No se pudo borrar la imagen, se reintentará:", error);
      }
    }
    // Se relee: pudieron encolarse referencias nuevas mientras tanto
    writeQueue(readQueue().filter((ref) => !done.has(ref)));
  };
  processing = (processing ?? Promise.resolve()).then(run, run);
  return processing;
};

const removeOrphans = async (
  files: { ref: ImageRef; createdAt: number }[],
  isReferenced: IsReferenced,
  now: number,
) => {
  const orphans = files
    .filter((f) => !isReferenced(f.ref) && now - f.createdAt > ORPHAN_GRACE_MS)
    .map((f) => f.ref);
  if (orphans.length === 0) return;
  for (const ref of orphans) {
    await resolveImageStore(ref).remove([ref]);
  }
};

/** Borra las imágenes locales que ninguna nota referencia (> 10 min). */
export const sweepLocalOrphans = async (
  isReferenced: IsReferenced,
  now = Date.now(),
): Promise<void> => {
  try {
    await removeOrphans(await localImageStore.listAll(), isReferenced, now);
  } catch (error) {
    console.error("No se pudo limpiar imágenes locales sin uso:", error);
  }
};

/** Borra los archivos remotos de una nota que la nota no referencia (> 10 min). */
export const sweepRemoteNote = async (
  noteId: string,
  isReferenced: IsReferenced,
  now = Date.now(),
): Promise<void> => {
  try {
    await removeOrphans(
      await remoteImageStore.listForNote(noteId),
      isReferenced,
      now,
    );
  } catch (error) {
    console.error("No se pudo limpiar imágenes sin uso de la nota:", error);
  }
};
