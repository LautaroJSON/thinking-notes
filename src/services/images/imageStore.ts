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
  const [localUrls, remoteUrls] = await Promise.all([
    urlsOrEmpty(localImageStore, refs.filter(isLocalRef)),
    urlsOrEmpty(
      remoteImageStore,
      refs.filter((ref) => !isLocalRef(ref)),
    ),
  ]);
  return new Map([...localUrls, ...remoteUrls]);
};

/** Fuerza a pedir de nuevo la URL (p. ej. si una URL firmada venció). */
export const invalidateImageUrl = (ref: ImageRef) => {
  if (!isLocalRef(ref)) remoteImageStore.invalidateUrl(ref);
};

export const getImageBlob = (ref: ImageRef): Promise<Blob> =>
  resolveImageStore(ref).getBlob(ref);
