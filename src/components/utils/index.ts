import type { INotes } from "@/types";
import { parseThinkings } from "@/types/thinking";

export const STORAGE_KEY = "notes";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const optionalString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

/**
 * Carga las notas locales normalizando los pensamientos al formato tipado.
 * Si alguna nota venía en el formato anterior (`string[]`), se reescribe
 * localStorage una sola vez con el resultado migrado.
 */
export const loadNotesFromStorage = (): INotes[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    let anyMigrated = false;
    const notes = parsed.filter(isRecord).map((raw): INotes => {
      const { thinkings, migrated } = parseThinkings(raw.thinkings);
      if (migrated) anyMigrated = true;
      const note: INotes = {
        title: typeof raw.title === "string" ? raw.title : "",
        thinkings,
      };
      const id = optionalString(raw.id);
      if (id !== undefined) note.id = id;
      const createdAt = optionalString(raw.createdAt);
      if (createdAt !== undefined) note.createdAt = createdAt;
      const updatedAt = optionalString(raw.updatedAt);
      if (updatedAt !== undefined) note.updatedAt = updatedAt;
      return note;
    });

    if (anyMigrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
    return notes;
  } catch (error) {
    console.error("Error cargando notas desde localStorage:", error);
    return [];
  }
};
