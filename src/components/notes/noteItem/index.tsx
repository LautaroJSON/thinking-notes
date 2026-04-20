import { useNotes } from "@/context/notesContext";
import "./styles.css";

// Componente que muestra solo el título de la nota
export const NoteItem = ({
  id,
  title,
  onDobleClick,
}: {
  id: string;
  title: string;
  onDobleClick: () => void;
}) => {
  const { getActiveNote } = useNotes();
  const activeNote = getActiveNote();

  return (
    <div
      className={`note-item-container ${id === activeNote?.id ? "active" : ""}`}
      onClick={onDobleClick}
    >
      <p>{title}</p>
    </div>
  );
};
