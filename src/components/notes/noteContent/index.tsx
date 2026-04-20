import { useNotes } from "@/context/notesContext";
import ActiveNoteView from "./components/activeNoteView";
import NoActiveNote from "./components/noActiveNote";
import "./styles.css";

const NoteContent = () => {
  const { activeNoteState, waitingResponse } = useNotes();
  console.log("estado de espera en NoteContent:", waitingResponse);
  return (
    <div
      className={`note-c-container ${waitingResponse === "deletingNote" ? "note-deleting" : ""}`}
    >
      {activeNoteState ? <ActiveNoteView /> : <NoActiveNote />}
    </div>
  );
};

export default NoteContent;
