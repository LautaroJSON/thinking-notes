import { useNotes } from "@/context/notesContext";
import type { INotes } from "@/types";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Check, Pencil, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

const ActiveNoteView = () => {
  const {
    activeNoteState,
    updateActiveNote,
    loadingSaveNote,
    saveUpdatesNotesOnDBorLocalStorage,
    setLoadingSaveNote,
  } = useNotes();
  const [isHoveredID, setIsHoveredID] = useState<number>(-1);
  const [isEditingID, setIsEditingID] = useState<number>(-1);
  const [editedNote, setEditedNote] = useState<INotes | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const ActiveNote = activeNoteState;
  const debouncedActiveNote = useDebounce(editedNote, 2000);

  useEffect(() => {
    if (debouncedActiveNote) {
      saveUpdatesNotesOnDBorLocalStorage();
    }
  }, [debouncedActiveNote]);

  const handleUpdateActiveNote = (updates: Partial<INotes>) => {
    setLoadingSaveNote(true);
    setEditedNote({ ...ActiveNote, ...updates } as INotes);
    updateActiveNote({ ...ActiveNote, ...updates });
  };

  const handleNewThinking = (newThinking: string) => {
    setLoadingSaveNote(true);
    const updatedThinkings = [...(ActiveNote?.thinkings || []), newThinking];
    setEditedNote({ ...ActiveNote, thinkings: updatedThinkings } as INotes);
    updateActiveNote({ thinkings: updatedThinkings });
  };

  const handleDeleteThinking = (thinkingIndex: number) => {
    updateActiveNote({
      ...ActiveNote,
      thinkings:
        ActiveNote?.thinkings.filter((_, i) => i !== thinkingIndex) || [],
    });
  };

  return (
    <div>
      <div className="title">
        <input
          type="text"
          value={ActiveNote?.title || ""}
          onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
          placeholder="Sin título"
          className="title-input"
        />
        <div className="save-indicator">
          {loadingSaveNote ? (
            <LoaderCircle size={20} className="loading-icon" />
          ) : (
            <Check size={20} className="check-icon" />
          )}
        </div>
      </div>
      <div className="thinking-list">
        {ActiveNote?.thinkings.map((thinking, index) => (
          <div
            key={index}
            onMouseEnter={() => setIsHoveredID(index)}
            onMouseLeave={() => setIsHoveredID(-1)}
            className="thinking-text-container"
          >
            {isEditingID === index ? (
              <textarea
                className="thinking-input"
                defaultValue={thinking}
                autoFocus
                ref={(el) => {
                  if (el) {
                    const length = el.value.length;
                    el.setSelectionRange(length, length);
                  }
                }}
                onBlur={(e) => {
                  handleUpdateActiveNote({
                    thinkings:
                      ActiveNote?.thinkings.map((t, i) =>
                        i === index ? e.target.value : t,
                      ) || [],
                  });
                  setIsEditingID(-1);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
              />
            ) : (
              <span key={index} className="thinking-text">
                {thinking}
              </span>
            )}
            {isHoveredID === index && (
              <div className="thinking-actions">
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsEditingID((prev) => (prev === index ? -1 : index));
                  }}
                  className="action-btn edit"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDeleteThinking(index)}
                  className="action-btn delete"
                  title="Borrar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
        <textarea
          ref={textAreaRef}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleNewThinking((e.currentTarget as HTMLTextAreaElement).value);
              e.currentTarget.value = "";
            }
          }}
          placeholder="Comienza a escribir tus ideas aqui :)"
          className="thinking-input"
        />
      </div>
    </div>
  );
};

export default ActiveNoteView;
