import type { INotes } from "@/types";

export const STORAGE_KEY = "notes";
export const loadNotesFromStorage = (): INotes[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error cargando notas desde localStorage:", error);
    return [];
  }
};
