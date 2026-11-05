import { useEffect, useId, useRef, useState } from "react";
import { Download, FileDown, FileText, LoaderCircle } from "lucide-react";
import type { INotes } from "@/types";
import {
  downloadNoteAsMarkdown,
  downloadNoteAsPdf,
} from "@/components/utils/exportNote";

// Botón que despliega las opciones para descargar la nota (Markdown o PDF).
// Se cierra al elegir una opción, al tocar afuera o con Escape.
const DownloadMenu = ({ note }: { note: INotes | null | undefined }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkdown = () => {
    if (!note) return;
    downloadNoteAsMarkdown(note);
    setIsOpen(false);
  };

  const handlePdf = async () => {
    if (!note || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      await downloadNoteAsPdf(note);
      setIsOpen(false);
    } catch (error) {
      console.error("No se pudo generar el PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="note-info" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="action-btn note-info-toggle"
        title="Descargar nota"
        aria-label="Descargar nota"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        <Download size={18} />
      </button>
      {isOpen && (
        <div id={menuId} role="menu" className="note-info-popover download-menu">
          <button type="button" role="menuitem" onClick={handleMarkdown}>
            <FileText size={16} />
            Descargar .md (Markdown)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handlePdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <LoaderCircle size={16} className="loading-icon" />
            ) : (
              <FileDown size={16} />
            )}
            Descargar PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default DownloadMenu;
