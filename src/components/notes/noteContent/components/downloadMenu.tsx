import { useEffect, useId, useRef, useState } from "react";
import useSounds from "@/hooks/useSounds";
import { Download, FileDown, FileText, LoaderCircle } from "lucide-react";
import type { INotes } from "@/types";
import {
  downloadNoteAsMarkdown,
  downloadNoteAsPdf,
} from "@/components/utils/exportNote";
import { getImageBlob } from "@/services/images/imageStore";

// Botón que despliega las opciones para descargar la nota (Markdown o PDF).
// Se cierra al elegir una opción, al tocar afuera o con Escape.
const DownloadMenu = ({ note }: { note: INotes | null | undefined }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const { play } = useSounds();

  useEffect(() => {
    if (!isOpen) return;
    const closeMenu = () => {
      setIsOpen(false);
      play("close");
    };
    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) closeMenu();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, play]);

  const toggle = () => {
    play(isOpen ? "close" : "select");
    setIsOpen((prev) => !prev);
  };

  const handleMarkdown = () => {
    if (!note) return;
    downloadNoteAsMarkdown(note);
    play("copy");
    setIsOpen(false);
  };

  const handlePdf = async () => {
    if (!note || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      await downloadNoteAsPdf(note, { getImageBlob });
      play("copy");
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
        onClick={toggle}
        className="action-btn note-info-toggle"
        title="Descargar nota"
        aria-label="Descargar nota"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        <Download size={17} />
      </button>
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          className="note-info-popover download-menu"
        >
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
            {isGeneratingPdf ? "Generando PDF…" : "Descargar PDF"}
          </button>
        </div>
      )}
    </div>
  );
};

export default DownloadMenu;
