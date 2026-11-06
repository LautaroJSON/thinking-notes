import type { INotes, Thinking } from "@/types";
import { isImageThinking, isTextThinking } from "@/types/thinking";

export const IMAGE_PLACEHOLDER = "[Imagen]";

// Representación en texto plano de un pensamiento: el texto tal cual, o el
// texto que acompaña a las imágenes seguido de un "[Imagen]" por cada una.
// Los tipos desconocidos no tienen representación ("").
export const thinkingToPlainText = (thinking: Thinking): string => {
  if (isTextThinking(thinking)) return thinking.value.trim();
  if (isImageThinking(thinking)) {
    const markers = thinking.value.map(() => IMAGE_PLACEHOLDER);
    const text = thinking.text?.trim();
    return [...(text ? [text] : []), ...markers].join(" ");
  }
  return "";
};

// Arma el texto plano de una nota para copiarlo al portapapeles:
// "Título: ..." y debajo "Notas:" con cada idea en su propia línea.
export const formatNoteForCopy = (
  note: Pick<INotes, "title" | "thinkings">,
): string => {
  const title = note.title.trim() || "Sin título";
  const thinkings = note.thinkings.map(thinkingToPlainText).filter(Boolean);
  return `Título: ${title}\n\nNotas:\n${thinkings.join("\n")}`.trimEnd();
};
