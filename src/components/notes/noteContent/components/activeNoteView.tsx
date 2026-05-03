import { useNotes } from "@/context/notesContext";
import type { INotes } from "@/types";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Check, Pencil, Trash2, Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useNoteSearch } from "@/hooks/useNoteSearch";
import type { Segment } from "@/hooks/useNoteSearch";

// Renderiza un párrafo con los matches resaltados
const HighlightedText = ({ segments }: { segments: Segment[] }) => (
  <>
    {segments.map((seg, i) =>
      seg.isMatch ? (
        <mark key={i} className="thinking-highlight">
          {seg.text}
        </mark>
      ) : (
        <span key={i}>{seg.text}</span>
      ),
    )}
  </>
);

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ActiveNote = activeNoteState;
  const debouncedActiveNote = useDebounce(editedNote, 2000);

  const { query, setQuery, matchCount, matchMap } = useNoteSearch(
    ActiveNote ?? null,
  );

  useEffect(() => {
    if (debouncedActiveNote) {
      saveUpdatesNotesOnDBorLocalStorage();
    }
  }, [debouncedActiveNote]);

  // Foco automático al abrir el buscador
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  // Atajo de teclado: Ctrl+F / Cmd+F para abrir buscador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape" && isSearchOpen) {
        handleCloseSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setQuery("");
  };

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
    <>
      <div className="title">
        <input
          type="text"
          value={ActiveNote?.title || ""}
          onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
          placeholder="Sin título"
          className="title-input"
        />
        <div className="title-actions">
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="action-btn search-toggle"
            title="Buscar (Ctrl+F)"
          >
            <Search size={18} />
          </button>
          <div className="save-indicator">
            {loadingSaveNote ? (
              <LoaderCircle size={20} className="loading-icon" />
            ) : (
              <Check size={20} className="check-icon" />
            )}
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div className="search-bar">
          <Search size={15} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en esta nota..."
            className="search-input"
          />
          {query && (
            <span className="search-count">
              {matchCount === 0
                ? "Sin resultados"
                : `${matchCount} coincidencia${matchCount !== 1 ? "s" : ""}`}
            </span>
          )}
          <button
            onClick={handleCloseSearch}
            className="action-btn"
            title="Cerrar (Esc)"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="thinking-list">
        <div className="thinkings-container">
          {ActiveNote?.thinkings.map((thinking, index) => {
            const segments = matchMap.get(index);
            const hasMatch = !!segments;

            return (
              <div
                key={index}
                onMouseEnter={() => setIsHoveredID(index)}
                onMouseLeave={() => setIsHoveredID(-1)}
                className={`thinking-text-container${hasMatch ? " thinking-has-match" : ""}`}
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
                  <span className="thinking-text">
                    {segments ? (
                      <HighlightedText segments={segments} />
                    ) : (
                      thinking
                    )}
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
            );
          })}
        </div>
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
    </>
  );
};

export default ActiveNoteView;
