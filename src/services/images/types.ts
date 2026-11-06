import type { ImageRef } from "@/types/thinking";

export interface StoredImageInfo {
  ref: ImageRef;
  /** Fecha de alta en ms (para la limpieza de huérfanos). */
  createdAt: number;
}

/** Interfaz común de los almacenamientos de imágenes (local y remoto). */
export interface ImageStore {
  /** Guarda el blob y devuelve su referencia. */
  save(blob: Blob, ctx: { noteId: string }): Promise<ImageRef>;
  /** URL que se puede mostrar en <img> (object URL o URL firmada). */
  getUrls(refs: ImageRef[]): Promise<Map<ImageRef, string>>;
  /** Blob de la imagen (para exportar a PDF). */
  getBlob(ref: ImageRef): Promise<Blob>;
  /** Borra los archivos; si alguno no existe no es un error. */
  remove(refs: ImageRef[]): Promise<void>;
}
