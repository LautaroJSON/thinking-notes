import type { INotes } from "@/types";

/**
 * Mueve la nota `fromId` a la posición que ocupa `toId`, desplazando al resto.
 * Devuelve el mismo array (misma referencia) si no hay nada que cambiar, para
 * que quien la llame pueda detectar el "no-op" y no guardar.
 */
export const moveNote = (
  notes: INotes[],
  fromId: string,
  toId: string,
): INotes[] => {
  const fromIndex = notes.findIndex((note) => note.id === fromId);
  const toIndex = notes.findIndex((note) => note.id === toId);

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return notes;
  }

  const next = [...notes];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

/**
 * Reordena `notes` según la lista de ids `order`, conservando el contenido
 * actual de cada nota. Las notas que no estén en `order` (por ejemplo, creadas
 * mientras se guardaba) quedan al final en su orden actual, y los ids de
 * `order` que ya no existen se ignoran.
 */
export const applyOrder = (notes: INotes[], order: string[]): INotes[] => {
  const byId = new Map(notes.map((note) => [note.id, note]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter((note): note is INotes => note !== undefined);
  const orderSet = new Set(order);
  const rest = notes.filter((note) => !note.id || !orderSet.has(note.id));
  return [...ordered, ...rest];
};
