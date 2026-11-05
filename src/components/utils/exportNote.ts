import type { INotes } from "@/types";

type ExportableNote = Pick<INotes, "title" | "thinkings">;

const UNTITLED = "Sin título";

const getTitle = (note: ExportableNote) => note.title.trim() || UNTITLED;
const getThinkings = (note: ExportableNote) =>
  note.thinkings.map((t) => t.trim()).filter(Boolean);

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

// jsPDF se carga recién al pedir un PDF, para no sumar peso a la carga inicial.
export const downloadNoteAsPdf = async (note: ExportableNote) => {
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
  for (const thinking of getThinkings(note)) {
    const lines: string[] = doc.splitTextToSize(
      thinking,
      contentWidth - bulletIndent,
    );
    lines.forEach((line, i) => {
      ensureSpace(lineHeight);
      if (i === 0) doc.text("•", margin, y);
      doc.text(line, margin + bulletIndent, y);
      y += lineHeight;
    });
    y += 2.5;
  }

  doc.save(toFileName(note.title, "pdf"));
};
