import type { IsLoggedType } from "@/types";
import { isLocalRef, type ImageRef } from "@/types/thinking";
import { localImageStore } from "./localImageStore";
import { remoteImageStore } from "./remoteImageStore";
import type { ImageStore } from "./types";

export type { ImageStore, StoredImageInfo } from "./types";
export { ImageStoreError, toImageStoreError } from "./errors";
export { localImageStore, remoteImageStore };

/**
 * Almacenamiento donde vive una referencia. Se decide por la referencia y no
 * por el modo actual: una nota local puede tener referencias remotas (copias
 * de notas remotas en localStorage) y viceversa (research R2).
 */
export const resolveImageStore = (ref: ImageRef): ImageStore =>
  isLocalRef(ref) ? localImageStore : remoteImageStore;

/** Almacenamiento donde se guardan las imágenes nuevas según la sesión. */
export const storeForMode = (isLogged: IsLoggedType): ImageStore =>
  isLogged === "online" ? remoteImageStore : localImageStore;

// URLs de imágenes recién enviadas, creadas a partir del mismo blob de la
// vista previa: así la miniatura aparece al instante, sin esperar a pedir la
// URL (firmada o de IndexedDB) ni a descargar la imagen.
const primedUrls = new Map<ImageRef, string>();

export const primeImageUrl = (ref: ImageRef, blob: Blob) => {
  if (!primedUrls.has(ref)) primedUrls.set(ref, URL.createObjectURL(blob));
};

/** URL ya disponible en memoria para la referencia, si la hay. */
export const peekImageUrl = (ref: ImageRef): string | undefined =>
  primedUrls.get(ref);

/** Libera la URL en memoria de una imagen borrada. */
export const forgetImageUrl = (ref: ImageRef) => {
  const url = primedUrls.get(ref);
  if (url) URL.revokeObjectURL(url);
  primedUrls.delete(ref);
};

/** Solo para tests. */
export const __resetPrimedUrlsForTests = () => {
  [...primedUrls.keys()].forEach(forgetImageUrl);
};

const urlsOrEmpty = async (
  store: ImageStore,
  refs: ImageRef[],
): Promise<Map<ImageRef, string>> => {
  if (refs.length === 0) return new Map();
  try {
    return await store.getUrls(refs);
  } catch (error) {
    // Sin red o sin sesión: esas imágenes se muestran como no disponibles
    console.error("No se pudieron obtener las imágenes:", error);
    return new Map();
  }
};

/**
 * Agrupa referencias por almacenamiento y resuelve sus URLs. Las que no se
 * pueden resolver quedan fuera del Map (la UI muestra "Imagen no disponible").
 */
export const getImageUrls = async (
  refs: ImageRef[],
): Promise<Map<ImageRef, string>> => {
  const primed = refs.flatMap((ref) => {
    const url = primedUrls.get(ref);
    return url ? [[ref, url] as const] : [];
  });
  const pending = refs.filter((ref) => !primedUrls.has(ref));
  const [localUrls, remoteUrls] = await Promise.all([
    urlsOrEmpty(localImageStore, pending.filter(isLocalRef)),
    urlsOrEmpty(
      remoteImageStore,
      pending.filter((ref) => !isLocalRef(ref)),
    ),
  ]);
  return new Map([...primed, ...localUrls, ...remoteUrls]);
};

/** Fuerza a pedir de nuevo la URL (p. ej. si una URL firmada venció). */
export const invalidateImageUrl = (ref: ImageRef) => {
  if (!isLocalRef(ref)) remoteImageStore.invalidateUrl(ref);
};

export const getImageBlob = (ref: ImageRef): Promise<Blob> =>
  resolveImageStore(ref).getBlob(ref);
