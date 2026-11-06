export type ImageStoreErrorCode = "quota" | "network" | "not-found" | "unknown";

const MESSAGES: Record<ImageStoreErrorCode, string> = {
  quota: "No hay espacio suficiente en el navegador para guardar la imagen.",
  network: "No se pudo subir la imagen. Revisá tu conexión e intentá de nuevo.",
  "not-found": "Imagen no disponible.",
  unknown: "No se pudo guardar la imagen. Intentá de nuevo.",
};

/** Error de almacenamiento de imágenes con un mensaje listo para mostrar. */
export class ImageStoreError extends Error {
  readonly code: ImageStoreErrorCode;

  constructor(code: ImageStoreErrorCode, options?: { cause?: unknown }) {
    super(MESSAGES[code], options);
    this.name = "ImageStoreError";
    this.code = code;
  }
}

export const toImageStoreError = (
  error: unknown,
  fallback: ImageStoreErrorCode = "unknown",
): ImageStoreError => {
  if (error instanceof ImageStoreError) return error;
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return new ImageStoreError("quota", { cause: error });
  }
  return new ImageStoreError(fallback, { cause: error });
};
