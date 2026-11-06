import { useEffect, useId, useRef, useState } from "react";
import useSounds from "@/hooks/useSounds";
import { CircleAlert } from "lucide-react";
import { formatNoteDate } from "@/components/utils/dates";

const UNAVAILABLE = "No disponible";

// Botón que despliega las fechas de creación y última modificación de la nota.
// Se cierra al tocar afuera o con Escape.
const NoteInfo = ({
  createdAt,
  updatedAt,
}: {
  createdAt?: string;
  updatedAt?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

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

  return (
    <div className="note-info" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        className="action-btn note-info-toggle"
        title="Información de la nota"
        aria-label="Información de la nota"
        aria-expanded={isOpen}
        aria-controls={popoverId}
      >
        <CircleAlert size={17} />
      </button>
      {isOpen && (
        <div id={popoverId} className="note-info-popover">
          <dl>
            <div>
              <dt>Creada</dt>
              <dd>{formatNoteDate(createdAt) ?? UNAVAILABLE}</dd>
            </div>
            <div>
              <dt>Última modificación</dt>
              <dd>{formatNoteDate(updatedAt) ?? UNAVAILABLE}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
};

export default NoteInfo;
