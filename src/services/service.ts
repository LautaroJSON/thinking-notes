import { supabase } from "../../lib/supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL_LOCAL as string;

if (!API_BASE_URL) {
  throw new Error("VITE_API_BASE_URL no está definida en el entorno.");
}

export interface RemoteNote {
  id: string;
  title: string;
  contentList: string[];
}

interface NoteCreatePayload {
  title: string;
  contentList: string[];
}

interface NoteUpdatePayload {
  title?: string;
  contentList?: string[];
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

export const getNotesService = async (): Promise<RemoteNote[]> => {
  return fetchJson<RemoteNote[]>("/notes", { method: "GET" });
};

export const createNoteService = async <T = unknown>(
  payload: NoteCreatePayload,
): Promise<T> => {
  return fetchJson<T>("/notes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateNoteService = async <T = unknown>(
  id: string,
  payload: NoteUpdatePayload,
): Promise<T> => {
  return fetchJson<T>(`/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export const deleteNoteService = async (id: string): Promise<void> => {
  await fetchJson(`/notes/${id}`, {
    method: "DELETE",
  });
};
