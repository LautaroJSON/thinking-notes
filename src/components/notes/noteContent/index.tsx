import { useNotes } from "@/context/notesContext";
import ActiveNoteView from "./components/activeNoteView";
import NoActiveNote from "./components/noActiveNote";
import "./styles.css";

const NoteContent = () => {
  const ActiveNote = useNotes().getActiveNote();

  return (
    <div className="note-c-container">
      {ActiveNote ? <ActiveNoteView /> : <NoActiveNote />}
    </div>
  );
};

export default NoteContent;
