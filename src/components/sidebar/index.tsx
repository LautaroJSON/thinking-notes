import { CircleArrowLeft, CircleArrowRight, Plus, Trash2 } from "lucide-react";
import "./styles.css";
import { useState } from "react";
import { useNotes } from "@/context/notesContext";
import { NoteItem } from "../notes/noteItem";
import useAuthentication from "@/hooks/useAuthentication";
import { supabase } from "../../../lib/supabaseClient";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading } = useAuthentication();
  const { notes, setActiveNote, addNote, deleteNote, activeNoteID } =
    useNotes();

  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <aside className={`sidebar-container ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-options">
        {loading ? (
          <div>Loading...</div>
        ) : user ? (
          <div>{user.identities?.[0]?.identity_data?.full_name || user.email}</div>
        ) : (
          <span onClick={handleSignIn}>Logear</span>
        )}
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
