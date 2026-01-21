import { CircleArrowLeft, CircleArrowRight, Plus, Trash2 } from "lucide-react";
import "./styles.css";
import { useState } from "react";
import { useNotes } from "@/context/notesContext";
import { NoteItem } from "../notes/noteItem";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { notes, setActiveNote, addNote, deleteNote, activeNoteID } =
    useNotes();

  return (
    <aside className={`sidebar-container ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-options">
        {activeNoteID !== null ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNote(activeNoteID);
            }}
            className="circular-button"
            title="Borrar"
          >
            <Trash2 color="white" />
          </button>
        ) : (
          ""
        )}
        <button
          className="circular-button"
          onClick={() => {
            addNote();
            setActiveNote(notes.length);
          }}
          title="Agregar nota"
        >
          <Plus color="white" />
        </button>
        <button
          className="circular-button"
          onClick={() => setCollapsed(!collapsed)}
          title="Colapsar/Expandir"
        >
          {collapsed ? (
            <CircleArrowRight color="white" />
          ) : (
            <CircleArrowLeft color="white" />
          )}
        </button>
      </div>
      <div className="sidebar-notes-list">
        {!collapsed &&
          notes.map((note, index) => (
            <NoteItem
              id={index}
              key={index}
              title={note.title}
              onDobleClick={() => setActiveNote(index)}
            />
          ))}
      </div>
    </aside>
  );
};

export default Sidebar;
