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
import { NotesSkeleton } from "../notes/noteItem/notesSkeleton";
import CustomizeMenu from "../customize";
import useSounds from "@/hooks/useSounds";

// Duración de la transición esqueleto → notas: el esqueleto se desvanece
// mientras las notas entran escalonadas (ver noteItem/styles.css).
const REVEAL_MS = 1700;
// Las notas a partir de esta posición entran todas juntas, para que una
// lista larga no tarde en terminar de aparecer.
const MAX_STAGGERED_NOTES = 10;

// Tiempo que se muestra el aviso de error al guardar el orden
const REORDER_ERROR_TIMEOUT_MS = 4000;

// Las notas solo se mueven en vertical y sin salir del área visible de la
// lista. Si la card arrastrada pudiera pasar el borde inferior, agrandaría el
// alto scrolleable; el auto-scroll bajaría y la card volvería a pasarse,
// generando un scroll infinito.
const restrictToListBounds: Modifier = ({
  transform,
  draggingNodeRect,
  scrollableAncestorRects,
}) => {
  const bounds = scrollableAncestorRects[0];
  if (!draggingNodeRect || !bounds) {
    return { ...transform, x: 0 };
  }

  const minY = bounds.top - draggingNodeRect.top;
  const maxY = bounds.bottom - draggingNodeRect.bottom;

  return {
    ...transform,
    x: 0,
    y: Math.min(Math.max(transform.y, minY), maxY),
  };
};

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
  const { play } = useSounds();
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

  // Al terminar de cargar las notas se arranca la transición de entrada.
  // Se detecta durante el render (y no en un efecto) para que el primer
  // frame con notas ya salga con la animación, sin un parpadeo previo.
  const [prevWaitingResponse, setPrevWaitingResponse] =
    useState(waitingResponse);
  const [isRevealing, setIsRevealing] = useState(false);
  if (prevWaitingResponse !== waitingResponse) {
    setPrevWaitingResponse(waitingResponse);
    if (prevWaitingResponse === "gettingNotes") setIsRevealing(true);
  }

  useEffect(() => {
    if (!isRevealing) return;
    const timeout = setTimeout(() => setIsRevealing(false), REVEAL_MS);
    return () => clearTimeout(timeout);
  }, [isRevealing]);

  useEffect(() => {
    if (!reorderError) return;
    const timeout = setTimeout(clearReorderError, REORDER_ERROR_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [reorderError, clearReorderError]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    play("drop");
    reorderNotes(String(active.id), String(over.id));
  };

  const activeNoteID = getActiveNote()?.id || null;
  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSecActiveNote = (noteID: string) => {
    play(activeNoteID === noteID ? "noteClose" : "noteOpen");
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

  const collapse = () => {
    play("panelClose");
    setCollapsed(true);
  };

  return (
    <>
      {/* Solo en mobile (ver styles.css): con el panel abierto, tocar fuera
          lo cierra y el toque no llega a la nota que queda detrás. Queda
          siempre montada para que el oscurecido entre y salga con transición */}
      <div
        className={`sidebar-backdrop ${collapsed ? "" : "visible"}`}
        aria-hidden="true"
        onClick={collapse}
      />
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
                onClick={() => {
                  play("panelOpen");
                  setCollapsed(false);
                }}
                title="Expandir"
              >
                <CircleArrowRight />
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
                    <User size={20} className="sidebar-user-icon" />
                    <span className="sidebar-user-name">Usuario local</span>
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
                    <Trash2 />
                  </button>
                ) : null}
                <button
                  className="circular-button"
                  onClick={() => {
                    addNote();
                  }}
                  title="Agregar nota"
                >
                  <Plus />
                </button>
                <button
                  className="circular-button"
                  onClick={collapse}
                  title="Colapsar/Expandir"
                >
                  <CircleArrowLeft />
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
        {!collapsed && (
          <div className="sidebar-notes-list">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToListBounds]}
              onDragStart={vibrate}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={notes.map((note) => note.id!)}
                strategy={verticalListSortingStrategy}
              >
                {notes.map((note, index) => (
                  <NoteItem
                    id={note.id!}
                    key={note.id!}
                    title={note.title}
                    enterIndex={
                      isRevealing
                        ? Math.min(index, MAX_STAGGERED_NOTES)
                        : undefined
                    }
                    disabled={isReorderDisabled}
                    onDobleClick={() => handleSecActiveNote(note.id!)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {notes.length === 0 &&
              waitingResponse !== "gettingNotes" &&
              waitingResponse !== "creatingNote" &&
              !isRevealing && (
                <div className="sidebar-empty-notes">
                  <p className="sidebar-empty-title">Todavía no hay notas</p>
                  <p className="sidebar-empty-hint">
                    Tocá <Plus size={14} aria-label="más" /> para crear la
                    primera
                  </p>
                </div>
              )}
            {waitingResponse === "creatingNote" && <FakeItemLoading />}
            {(waitingResponse === "gettingNotes" || isRevealing) && (
              <NotesSkeleton leaving={isRevealing} />
            )}
          </div>
        )}
        {!collapsed && (
          <div className="sidebar-footer">
            <CustomizeMenu />
          </div>
        )}
        <ProfileModal isOpen={isProfileOpen} onClose={handleOnCloseeProfile} />
      </aside>
    </>
  );
};

export default Sidebar;
