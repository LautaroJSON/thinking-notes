import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../../lib/supabaseClient";
import { isLocalRef, type ImageRef } from "@/types/thinking";
import { extensionForType } from "@/components/utils/imageProcessing";
import { ImageStoreError } from "./errors";
import type { ImageStore, StoredImageInfo } from "./types";

// Imágenes del modo con sesión en Supabase Storage (research R4). El bucket es
// privado y las políticas RLS limitan cada usuario a su carpeta `<userId>/`.
export const IMAGES_BUCKET = "thinking-images";
export const SIGNED_URL_TTL_S = 3600;
// Una URL firmada a la que le quedan menos de 5 minutos se vuelve a pedir
const RENEW_MARGIN_MS = 5 * 60 * 1000;

const bucket = () => supabase.storage.from(IMAGES_BUCKET);

const getUserId = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getSession();
  const userId = data.session?.user?.id;
  if (error || !userId) {
    throw new ImageStoreError("network", { cause: error });
  }
  return userId;
};

const noteFolder = (userId: string, noteId: string) => `${userId}/${noteId}`;

const urlCache = new Map<ImageRef, { url: string; expiresAt: number }>();

const isRemoteRef = (ref: ImageRef) => !isLocalRef(ref);

export const remoteImageStore: ImageStore & {
  listForNote(noteId: string): Promise<StoredImageInfo[]>;
  removeNoteFolder(noteId: string): Promise<void>;
  invalidateUrl(ref: ImageRef): void;
} = {
  async save(blob, { noteId }) {
    const userId = await getUserId();
    const path = `${noteFolder(userId, noteId)}/${uuidv4()}.${extensionForType(blob.type)}`;
    const { error } = await bucket().upload(path, blob, {
      contentType: blob.type,
      upsert: false,
      cacheControl: "3600",
    });
    if (error) throw new ImageStoreError("network", { cause: error });
    return path;
  },

  async getUrls(refs) {
    const now = Date.now();
    const urls = new Map<ImageRef, string>();
    const toSign: ImageRef[] = [];

    for (const ref of refs.filter(isRemoteRef)) {
      const cached = urlCache.get(ref);
      if (cached && cached.expiresAt - now > RENEW_MARGIN_MS) {
        urls.set(ref, cached.url);
      } else {
        toSign.push(ref);
      }
    }
    if (toSign.length === 0) return urls;

    // Una sola llamada para todas las imágenes que faltan
    const { data, error } = await bucket().createSignedUrls(
      toSign,
      SIGNED_URL_TTL_S,
    );
    if (error) throw new ImageStoreError("network", { cause: error });

    const expiresAt = now + SIGNED_URL_TTL_S * 1000;
    for (const item of data ?? []) {
      if (item.error || !item.path || !item.signedUrl) continue;
      urlCache.set(item.path, { url: item.signedUrl, expiresAt });
      urls.set(item.path, item.signedUrl);
    }
    return urls;
  },

  invalidateUrl(ref) {
    urlCache.delete(ref);
  },

  async getBlob(ref) {
    const { data, error } = await bucket().download(ref);
    if (error || !data) throw new ImageStoreError("not-found", { cause: error });
    return data;
  },

  async remove(refs) {
    const paths = refs.filter(isRemoteRef);
    if (paths.length === 0) return;
    // Borrar un archivo que ya no existe no devuelve error
    const { error } = await bucket().remove(paths);
    if (error) throw new ImageStoreError("network", { cause: error });
    paths.forEach((path) => urlCache.delete(path));
  },

  async listForNote(noteId) {
    const userId = await getUserId();
    const folder = noteFolder(userId, noteId);
    const { data, error } = await bucket().list(folder, { limit: 1000 });
    if (error) throw new ImageStoreError("network", { cause: error });
    return (data ?? [])
      .filter((file) => file.id !== null && !file.name.startsWith("."))
      .map((file) => ({
        ref: `${folder}/${file.name}`,
        createdAt: file.created_at ? Date.parse(file.created_at) : 0,
      }));
  },

  async removeNoteFolder(noteId) {
    const files = await remoteImageStore.listForNote(noteId);
    await remoteImageStore.remove(files.map((file) => file.ref));
  },
};

/** Solo para tests. */
export const __resetRemoteImageStoreForTests = () => urlCache.clear();
