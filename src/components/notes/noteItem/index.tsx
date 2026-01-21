import { useNotes } from "@/context/notesContext";
import "./styles.css";

// Componente que muestra solo el título de la nota
export const NoteItem = ({
  id,
  title,
  onDobleClick,
}: {
  id: number;
  title: string;
  onDobleClick: () => void;
}) => {
  const { activeNoteID } = useNotes();

  return (
    <div
      className={`note-item-container ${id === activeNoteID ? "active" : ""}`}
      onClick={onDobleClick}
    >
      <p>{title}</p>
    </div>
  );
};
