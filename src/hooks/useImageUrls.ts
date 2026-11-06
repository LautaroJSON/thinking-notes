import { useCallback, useEffect, useState } from "react";
import type { ImageRef } from "@/types/thinking";
import { getImageUrls, invalidateImageUrl } from "@/services/images/imageStore";

export interface ImageUrlState {
  status: "loading" | "ready" | "error";
  url?: string;
}

interface Resolved {
  key: string;
  urls: Map<ImageRef, string>;
}

/**
 * Resuelve referencias de imágenes a URLs que se pueden mostrar en <img>
 * (object URLs locales o URLs firmadas). `refresh` vuelve a pedir una URL,
 * por ejemplo si una URL firmada venció mientras la nota estaba abierta.
 */
export const useImageUrls = (refs: ImageRef[]) => {
  const [version, setVersion] = useState(0);
  const key = `${version}:${refs.join("|")}`;
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useEffect(() => {
    let cancelled = false;
    const list = key.slice(key.indexOf(":") + 1).split("|").filter(Boolean);
    getImageUrls(list).then((urls) => {
      if (!cancelled) setResolved({ key, urls });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const getState = useCallback(
    (ref: ImageRef): ImageUrlState => {
      // Mientras no llegue la respuesta para estas refs, se muestran cargando
      if (resolved?.key !== key) return { status: "loading" };
      const url = resolved.urls.get(ref);
      return url ? { status: "ready", url } : { status: "error" };
    },
    [resolved, key],
  );

  const refresh = useCallback((ref: ImageRef) => {
    invalidateImageUrl(ref);
    setVersion((v) => v + 1);
  }, []);

  return { getState, refresh };
};
