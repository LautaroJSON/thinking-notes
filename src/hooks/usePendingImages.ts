import { useCallback, useState, useSyncExternalStore } from "react";
import { v4 as uuidv4 } from "uuid";
import { MAX_IMAGES_PER_THINKING } from "@/types/thinking";
import {
  compressImage,
  IMAGE_ERRORS,
  ImageProcessingError,
} from "@/components/utils/imageProcessing";

export interface PendingImage {
  localId: string;
  status: "processing" | "ready";
  blob?: Blob;
  previewUrl?: string;
  width?: number;
  height?: number;
}

// Imágenes pegadas sin enviar, por nota. Viven fuera del componente (como el
// borrador de texto) para que no se pierdan al cambiar de nota o al cerrarla y
// volver a abrirla. Se descartan al enviarlas, quitarlas o borrar la nota.
// No sobreviven a recargar la página.
const EMPTY: PendingImage[] = [];
const drafts = new Map<string, PendingImage[]>();
const listeners = new Set<() => void>();

const getImages = (noteId: string) => drafts.get(noteId) ?? EMPTY;

const setImages = (
  noteId: string,
  update: (prev: PendingImage[]) => PendingImage[],
) => {
  const next = update(getImages(noteId));
  if (next.length === 0) drafts.delete(noteId);
  else drafts.set(noteId, next);
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const revoke = (images: PendingImage[]) =>
  images.forEach((img) => img.previewUrl && URL.revokeObjectURL(img.previewUrl));

/** Descarta las imágenes sin enviar de una nota (p. ej. al borrarla). */
export const discardPendingImages = (noteId: string) => {
  revoke(getImages(noteId));
  setImages(noteId, () => EMPTY);
};

/** Solo para tests. */
export const __resetPendingImagesForTests = () => {
  [...drafts.keys()].forEach(discardPendingImages);
};

/**
 * Bandeja de imágenes pegadas que todavía no se enviaron en la nota `noteId`.
 * Comprime al pegar (para mostrar errores en el momento y previsualizar lo
 * que se guarda) y respeta el máximo de imágenes por pensamiento.
 */
export const usePendingImages = (noteId: string | undefined) => {
  const key = noteId ?? "";
  const images = useSyncExternalStore(
    subscribe,
    () => getImages(key),
    () => getImages(key),
  );
  // El error se muestra solo en la nota donde ocurrió
  const [errorState, setErrorState] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const error = errorState?.key === key ? errorState.message : null;

  const setError = useCallback(
    (message: string | null) =>
      setErrorState(message ? { key, message } : null),
    [key],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const slots = MAX_IMAGES_PER_THINKING - getImages(key).length;
      const accepted = files.slice(0, Math.max(0, slots));
      setError(files.length > accepted.length ? IMAGE_ERRORS.tooMany : null);
      if (accepted.length === 0) return;

      const entries = accepted.map((file) => ({ file, localId: uuidv4() }));
      setImages(key, (prev) => [
        ...prev,
        ...entries.map(({ localId }) => ({
          localId,
          status: "processing" as const,
        })),
      ]);

      // La compresión termina en la nota donde se pegó, aunque mientras
      // tanto se haya cambiado de nota
      entries.forEach(async ({ file, localId }) => {
        const isStillPending = () =>
          getImages(key).some((img) => img.localId === localId);
        try {
          const { blob, width, height } = await compressImage(file);
          if (!isStillPending()) return;
          const previewUrl = URL.createObjectURL(blob);
          setImages(key, (prev) =>
            prev.map((img) =>
              img.localId === localId
                ? { localId, status: "ready", blob, previewUrl, width, height }
                : img,
            ),
          );
        } catch (err) {
          if (!isStillPending()) return;
          setImages(key, (prev) =>
            prev.filter((img) => img.localId !== localId),
          );
          setErrorState({
            key,
            message:
              err instanceof ImageProcessingError
                ? err.message
                : IMAGE_ERRORS.unreadable,
          });
        }
      });
    },
    [key, setError],
  );

  const remove = useCallback(
    (localId: string) => {
      revoke(getImages(key).filter((img) => img.localId === localId));
      setImages(key, (prev) => prev.filter((img) => img.localId !== localId));
      setErrorState(null);
    },
    [key],
  );

  const clear = useCallback(() => {
    discardPendingImages(key);
    setErrorState(null);
  }, [key]);

  const dismissError = useCallback(() => setErrorState(null), []);

  const isProcessing = images.some((img) => img.status === "processing");
  const readyBlobs = images.flatMap((img) => (img.blob ? [img.blob] : []));

  return {
    images,
    error,
    setError,
    dismissError,
    addFiles,
    remove,
    clear,
    isProcessing,
    readyBlobs,
  };
};
