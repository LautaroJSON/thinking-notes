import type { INotes } from "@/types";
import {
  isImageThinking,
  isTextThinking,
  type ImageRef,
} from "@/types/thinking";
import { thinkingToPlainText } from "./copyNote";

type ExportableNote = Pick<INotes, "title" | "thinkings">;

const UNTITLED = "Sin título";

const getTitle = (note: ExportableNote) => note.title.trim() || UNTITLED;
// Textos de los pensamientos para Markdown: las imágenes se representan con
// "[Imagen]" y los tipos desconocidos se omiten.
const getThinkings = (note: ExportableNote) =>
  note.thinkings.map(thinkingToPlainText).filter(Boolean);

// Nombre de archivo seguro a partir del título (sin caracteres inválidos en Windows/macOS/Linux).
export const toFileName = (title: string, extension: string): string => {
  const base = title
    .trim()
    // eslint-disable-next-line no-control-regex -- se quitan a propósito
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .trim();
  return `${base || "nota"}.${extension}`;
};

// Título como encabezado y cada idea como un ítem de lista.
// Las ideas con varias líneas se indentan para que sigan dentro del mismo ítem.
export const noteToMarkdown = (note: ExportableNote): string => {
  const items = getThinkings(note).map(
    (t) => `- ${t.replace(/\r?\n/g, "\n  ")}`,
  );
  return `# ${getTitle(note)}\n${items.length ? `\n${items.join("\n")}\n` : ""}`;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const downloadNoteAsMarkdown = (note: ExportableNote) => {
  const blob = new Blob([noteToMarkdown(note)], {
    type: "text/markdown;charset=utf-8",
  });
  downloadBlob(blob, toFileName(note.title, "md"));
};

export interface JpegImage {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Convierte una imagen (WebP/PNG/JPEG) a JPEG en un canvas con fondo blanco.
 * Así el PDF no depende del soporte de WebP de jsPDF y queda liviano (R9).
 */
export const blobToJpegDataUrl = async (blob: Blob): Promise<JpegImage> => {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.85),
    width: canvas.width,
    height: canvas.height,
  };
};

export const IMAGE_UNAVAILABLE_PDF = "[Imagen no disponible]";

export interface PdfImageOptions {
  /** Obtiene el archivo de una imagen; sin esto las imágenes se omiten. */
  getImageBlob?: (ref: ImageRef) => Promise<Blob>;
  /** Inyectable para tests. */
  toJpeg?: (blob: Blob) => Promise<JpegImage>;
}

// jsPDF se carga recién al pedir un PDF, para no sumar peso a la carga inicial.
export const downloadNoteAsPdf = async (
  note: ExportableNote,
  { getImageBlob, toJpeg = blobToJpegDataUrl }: PdfImageOptions = {},
) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const bulletIndent = 5;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLineHeight = 8;
  for (const line of doc.splitTextToSize(getTitle(note), contentWidth)) {
    ensureSpace(titleLineHeight);
    doc.text(line, margin, y);
    y += titleLineHeight;
  }
  y += 4;

  // Ideas
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lineHeight = 5.5;
  const textX = margin + bulletIndent;
  const textWidth = contentWidth - bulletIndent;
  const maxImageHeight = pageHeight - margin * 2;

  // Escribe un texto con viñeta (solo si `withBullet`) en una o más líneas
  const writeText = (text: string, withBullet: boolean) => {
    const lines: string[] = doc.splitTextToSize(text, textWidth);
    lines.forEach((line, i) => {
      ensureSpace(lineHeight);
      if (withBullet && i === 0) doc.text("•", margin, y);
      doc.text(line, textX, y);
      y += lineHeight;
    });
  };

  // Imagen al ancho útil conservando la proporción; si es más alta que la
  // página, se achica para que entre
  const writeImage = async (ref: ImageRef, withBullet: boolean) => {
    try {
      if (!getImageBlob) throw new Error("Sin acceso a las imágenes");
      const image = await toJpeg(await getImageBlob(ref));
      let width = textWidth;
      let height = (image.height / image.width) * width;
      if (height > maxImageHeight) {
        width = (maxImageHeight / height) * width;
        height = maxImageHeight;
      }
      ensureSpace(height);
      if (withBullet) doc.text("•", margin, y + lineHeight - 1.5);
      doc.addImage(image.dataUrl, "JPEG", textX, y, width, height);
      y += height + 2;
    } catch (error) {
      console.error("No se pudo agregar la imagen al PDF:", error);
      writeText(IMAGE_UNAVAILABLE_PDF, withBullet);
    }
  };

  for (const thinking of note.thinkings) {
    if (isTextThinking(thinking)) {
      const text = thinking.value.trim();
      if (!text) continue;
      writeText(text, true);
    } else if (isImageThinking(thinking)) {
      // Primero el texto que acompaña y después las imágenes
      const text = thinking.text?.trim();
      if (text) writeText(text, true);
      for (const [i, ref] of thinking.value.entries()) {
        await writeImage(ref, !text && i === 0);
      }
    } else {
      continue;
    }
    y += 2.5;
  }

  doc.save(toFileName(note.title, "pdf"));
};
