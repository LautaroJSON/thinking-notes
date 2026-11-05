import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNotes } from "@/hooks/useNotes";
import "./styles.css";

// Transición propia del ítem (ver styles.css); se combina con la de dnd-kit
// porque el estilo inline la reemplazaría.
const WIDTH_TRANSITION = "width 0.2s ease";

// Componente que muestra solo el título de la nota. Se puede arrastrar para
// reordenar la lista (ver Sidebar, que define los sensores y el DndContext).
export const NoteItem = ({
  id,
  title,
  onDobleClick,
  disabled = false,
}: {
  id: string;
  title: string;
  onDobleClick: () => void;
  disabled?: boolean;
}) => {
  const { getActiveNote } = useNotes();
  const activeNote = getActiveNote();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: CSSProperties = {
    // Solo traslación: CSS.Transform incluye scaleX/scaleY cuando las notas
    // tienen anchos distintos (hover/activa) y eso deforma la card.
    transform: CSS.Translate.toString(transform),
    transition: [transition, WIDTH_TRANSITION].filter(Boolean).join(", "),
  };

  const classNames = [
    "note-item-container",
    id === activeNote?.id ? "active" : "",
    isDragging ? "dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={classNames}
      onClick={onDobleClick}
      // Mantener apretado en táctil no debe abrir el menú del navegador
      onContextMenu={(e) => e.preventDefault()}
      {...attributes}
      {...listeners}
    >
      <p>{title}</p>
    </div>
  );
};
