import {
  CircleArrowLeft,
  CircleArrowRight,
  Loader2,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import "./styles.css";
import { useEffect, useState } from "react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useNotes } from "@/hooks/useNotes";
import { NoteItem } from "../notes/noteItem";
import useAuthentication from "@/hooks/useAuthentication";
import { supabase } from "../../../lib/supabaseClient";
import ProfileModal from "../profile";
import { FakeItemLoading } from "../notes/noteItem/fakeItemLoading";

// Tiempo que se muestra el aviso de error al guardar el orden
const REORDER_ERROR_TIMEOUT_MS = 4000;

// Las notas solo se mueven en vertical
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

// Vibración leve al levantar una nota (donde el dispositivo la soporte)
const vibrate = () => {
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(10);
  }
};

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
    reorderNotes,
    reorderError,
    clearReorderError,
  } = useNotes();

  // Mouse: un clic sin moverse sigue abriendo la nota; el arrastre empieza a
  // los 6 px. Táctil: hay que mantener apretado 400 ms; si el dedo se mueve
  // antes, es un scroll normal de la lista.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 400, tolerance: 6 },
    }),
  );
  const isReorderDisabled = waitingResponse !== "none";

  useEffect(() => {
    if (!reorderError) return;
    const timeout = setTimeout(clearReorderError, REORDER_ERROR_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [reorderError, clearReorderError]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    reorderNotes(String(active.id), String(over.id));
  };

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
      {!collapsed &&
        (waitingResponse === "reorderingNotes" || reorderError) && (
          <div className="sidebar-reorder-status" role="status">
            {reorderError ? (
              <span className="sidebar-reorder-error">{reorderError}</span>
            ) : (
              <>
                <Loader2 size={14} className="spinner-icon" />
                <span>Guardando orden…</span>
              </>
            )}
          </div>
        )}
      <div className="sidebar-notes-list">
        {!collapsed && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={vibrate}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={notes.map((note) => note.id!)}
              strategy={verticalListSortingStrategy}
            >
              {notes.map((note) => (
                <NoteItem
                  id={note.id!}
                  key={note.id!}
                  title={note.title}
                  disabled={isReorderDisabled}
                  onDobleClick={() => handleSecActiveNote(note.id!)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
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
