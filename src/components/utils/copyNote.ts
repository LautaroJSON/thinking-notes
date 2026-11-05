import type { INotes } from "@/types";

// Arma el texto plano de una nota para copiarlo al portapapeles:
// "Título: ..." y debajo "Notas:" con cada idea en su propia línea.
export const formatNoteForCopy = (
  note: Pick<INotes, "title" | "thinkings">,
): string => {
  const title = note.title.trim() || "Sin título";
  const thinkings = note.thinkings.map((t) => t.trim()).filter(Boolean);
  return `Título: ${title}\n\nNotas:\n${thinkings.join("\n")}`.trimEnd();
};
