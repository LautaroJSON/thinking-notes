import { useCallback, useEffect, useRef, useState } from "react";
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

/**
 * Bandeja de imágenes pegadas que todavía no se enviaron. Comprime al pegar
 * (para mostrar errores en el momento y previsualizar exactamente lo que se
 * guarda), respeta el máximo por pensamiento y libera las object URLs.
 */
export const usePendingImages = () => {
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Ids vigentes: si se quitó o se vació la bandeja mientras se comprimía,
  // el resultado se descarta
  const activeIds = useRef(new Set<string>());
  const urls = useRef(new Map<string, string>());
  const count = useRef(0);

  const revoke = (localId: string) => {
    const url = urls.current.get(localId);
    if (url) URL.revokeObjectURL(url);
    urls.current.delete(localId);
  };

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const slots = MAX_IMAGES_PER_THINKING - count.current;
    const accepted = files.slice(0, Math.max(0, slots));
    setError(files.length > accepted.length ? IMAGE_ERRORS.tooMany : null);
    if (accepted.length === 0) return;

    const entries = accepted.map((file) => ({ file, localId: uuidv4() }));
    count.current += entries.length;
    entries.forEach(({ localId }) => activeIds.current.add(localId));
    setImages((prev) => [
      ...prev,
      ...entries.map(({ localId }) => ({
        localId,
        status: "processing" as const,
      })),
    ]);

    entries.forEach(async ({ file, localId }) => {
      try {
        const { blob, width, height } = await compressImage(file);
        if (!activeIds.current.has(localId)) return;
        const previewUrl = URL.createObjectURL(blob);
        urls.current.set(localId, previewUrl);
        setImages((prev) =>
          prev.map((img) =>
            img.localId === localId
              ? { localId, status: "ready", blob, previewUrl, width, height }
              : img,
          ),
        );
      } catch (err) {
        if (!activeIds.current.has(localId)) return;
        activeIds.current.delete(localId);
        count.current -= 1;
        setImages((prev) => prev.filter((img) => img.localId !== localId));
        setError(
          err instanceof ImageProcessingError
            ? err.message
            : IMAGE_ERRORS.unreadable,
        );
      }
    });
  }, []);

  const remove = useCallback((localId: string) => {
    if (!activeIds.current.delete(localId)) return;
    count.current -= 1;
    revoke(localId);
    setImages((prev) => prev.filter((img) => img.localId !== localId));
    setError(null);
  }, []);

  const clear = useCallback(() => {
    activeIds.current.clear();
    count.current = 0;
    [...urls.current.keys()].forEach(revoke);
    setImages([]);
    setError(null);
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  // Al desmontar se liberan las URLs de vista previa
  useEffect(() => {
    const currentUrls = urls.current;
    const currentIds = activeIds.current;
    return () => {
      currentIds.clear();
      currentUrls.forEach((url) => URL.revokeObjectURL(url));
      currentUrls.clear();
    };
  }, []);

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
