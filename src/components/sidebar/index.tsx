import {
  CircleArrowLeft,
  CircleArrowRight,
  Loader2,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import "./styles.css";
import { useState } from "react";
import { useNotes } from "@/context/notesContext";
import { NoteItem } from "../notes/noteItem";
import useAuthentication from "@/hooks/useAuthentication";
import { supabase } from "../../../lib/supabaseClient";
import ProfileModal from "../profile";
import { FakeItemLoading } from "../notes/noteItem/fakeItemLoading";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, loading } = useAuthentication();
  const {
    notes,
    addNote,
    deleteNote,
    setActiveNote,
    getActiveNote,
    closeActiveNote,
    waitingResponse,
  } = useNotes();

  const activeNoteID = getActiveNote()?.id || null;
  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/thinking-notes/`,
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSecActiveNote = (noteID: string) => {
    if (activeNoteID === noteID) {
      closeActiveNote();
    } else {
      setActiveNote(noteID);
    }
  };

  const handleOnCloseeProfile = () => {
    setIsProfileOpen(false);
    closeActiveNote();
  };

  return (
    <aside className={`sidebar-container ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-options">
        {collapsed ? (
          <div className="sidebar-collapsed-content">
            {user ? (
              <div className="sidebar-avatar-only">
                <img
                  src={user?.user_metadata?.picture || "/default-avatar.png"}
                  alt="Profile"
                  className="sidebar-user-avatar"
                />
              </div>
            ) : (
              <div className="sidebar-user-info" onClick={handleSignIn}>
                <User size={20} />
              </div>
            )}
            <button
              className="circular-button"
              onClick={() => setCollapsed(false)}
              title="Expandir"
            >
              <CircleArrowRight color="white" />
            </button>
          </div>
        ) : (
          <>
            <div className="sidebar-user-section">
              {loading ? (
                <div>Loading...</div>
              ) : user ? (
                <div
                  className="sidebar-user-info"
                  onClick={() => setIsProfileOpen(true)}
                >
                  <img
                    src={user.user_metadata?.picture || "/default-avatar.png"}
                    alt="Profile"
                    className="sidebar-user-avatar"
                  />
                  <span className="sidebar-user-name">
                    {user.user_metadata?.full_name ||
                      user.user_metadata?.name ||
                      user.email}
                  </span>
                </div>
              ) : (
                <div className="sidebar-user-info" onClick={handleSignIn}>
                  <User size={20} />
                  <span>Usuario local</span>
                </div>
              )}
            </div>
            <div className="sidebar-action-buttons">
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
              ) : null}
              <button
                className="circular-button"
                onClick={() => {
                  addNote();
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
                <CircleArrowLeft color="white" />
              </button>
            </div>
          </>
        )}
      </div>
      <div className="sidebar-notes-list">
        {!collapsed &&
          notes.map((note) => (
            <NoteItem
              id={note.id!}
              key={note.id!}
              title={note.title}
              onDobleClick={() => handleSecActiveNote(note.id!)}
            />
          ))}
        {!collapsed && waitingResponse === "creatingNote" && (
          <FakeItemLoading />
        )}
        {!collapsed && waitingResponse === "gettingNotes" && (
          <div className="sidebar-getting-notes-container ">
            <Loader2 size={32} className="spinner-icon" />
          </div>
        )}
      </div>
      <ProfileModal isOpen={isProfileOpen} onClose={handleOnCloseeProfile} />
    </aside>
  );
};

export default Sidebar;
