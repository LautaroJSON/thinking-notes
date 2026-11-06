import { supabase } from "../../lib/supabaseClient";
import { parseThinkings, type Thinking } from "@/types/thinking";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL no está definida en el entorno.");
}

export interface RemoteNote {
  id: string;
  title: string;
  contentList: Thinking[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface NoteResponse {
  id: string;
  userId: string;
  title: string;
  contentList: Thinking[];
  createdAt: string | null;
  updatedAt: string | null;
}

interface NoteCreatePayload {
  title: string;
  contentList: Thinking[];
}

interface NoteUpdatePayload {
  title?: string;
  contentList?: Thinking[];
}

const getAccessToken = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error(
      "No se encontró access token. El usuario debe iniciar sesión para usar este servicio.",
    );
  }

  return token;
};

const fetchJson = async <T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> => {
  const url = new URL(path, API_BASE_URL).href;
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (authenticated) {
    const token = await getAccessToken();
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
};

// La API devuelve `contentList` como JSON libre: se valida y normaliza acá,
// así el resto de la app recibe siempre `Thinking[]` bien formados.
const withParsedContent = <T extends { contentList: unknown }>(
  note: T,
): T & { contentList: Thinking[] } => ({
  ...note,
  contentList: parseThinkings(note.contentList).thinkings,
});

export const getNotesService = async (): Promise<RemoteNote[]> => {
  const notes = await fetchJson<RemoteNote[]>("/notes", { method: "GET" });
  return notes.map(withParsedContent);
};

export const createNoteService = async (
  payload: NoteCreatePayload,
): Promise<NoteResponse> => {
  const note = await fetchJson<NoteResponse>("/notes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return withParsedContent(note);
};

export const updateNoteService = async (
  id: string,
  payload: NoteUpdatePayload,
): Promise<NoteResponse> => {
  const note = await fetchJson<NoteResponse>(`/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return withParsedContent(note);
};

export const deleteNoteService = async (
  id: string,
): Promise<{ id: string }> => {
  return fetchJson<{ id: string }>(`/notes/${id}`, {
    method: "DELETE",
  });
};

export const reorderNotesService = async (
  ids: string[],
): Promise<{ ids: string[] }> => {
  return fetchJson<{ ids: string[] }>("/notes/order", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
};
