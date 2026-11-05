// Borradores por nota: el texto a medio escribir en el cuadro de "nuevo
// pensamiento" se guarda en este navegador para no perderlo al cerrar la
// nota, cambiar de nota o recargar la página.

export const DRAFTS_STORAGE_KEY = "note-drafts";

type DraftsMap = Record<string, string>;

const readDrafts = (): DraftsMap => {
  try {
    const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
};

const writeDrafts = (drafts: DraftsMap) => {
  try {
    if (Object.keys(drafts).length === 0) {
      localStorage.removeItem(DRAFTS_STORAGE_KEY);
    } else {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    }
  } catch (error) {
    console.error("Error guardando borradores en localStorage:", error);
  }
};

export const loadDraft = (noteId: string | undefined): string => {
  if (!noteId) return "";
  const draft = readDrafts()[noteId];
  return typeof draft === "string" ? draft : "";
};

export const saveDraft = (noteId: string | undefined, text: string) => {
  if (!noteId) return;
  const drafts = readDrafts();
  if (text) {
    if (drafts[noteId] === text) return;
    drafts[noteId] = text;
  } else {
    if (!(noteId in drafts)) return;
    delete drafts[noteId];
  }
  writeDrafts(drafts);
};

export const clearDraft = (noteId: string | undefined) => saveDraft(noteId, "");
