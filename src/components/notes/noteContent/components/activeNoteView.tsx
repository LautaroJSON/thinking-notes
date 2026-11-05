import { useNotes } from "@/hooks/useNotes";
import type { INotes } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Check, Pencil, Trash2, Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useNoteSearch } from "@/hooks/useNoteSearch";
import type { Segment } from "@/hooks/useNoteSearch";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import {
  appendTranscript,
  composeDraft,
  stripInterim,
} from "@/components/utils/dictation";
import DictationButton from "./dictationButton";

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

// Un toque más corto que esto no cuenta como "mantener presionado"
const SHORT_TAP_MS = 300;

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
  const [draft, setDraft] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ActiveNote = activeNoteState;
  const debouncedActiveNote = useDebounce(editedNote, 2000);

  const { query, setQuery, matchCount, matchMap } = useNoteSearch(
    ActiveNote ?? null,
  );

  const handleFinalText = useCallback((text: string) => {
    setDraft((prev) => appendTranscript(prev, text));
  }, []);

  const {
    isSupported: isDictationSupported,
    status: dictationStatus,
    mode: dictationMode,
    interimText,
    message: dictationMessage,
    start: startDictation,
    stop: stopDictation,
    cancel: cancelDictation,
    resetSegment,
    showHint,
  } = useSpeechDictation({ onFinalText: handleFinalText });
  const isDictating = dictationStatus === "listening";
  const activeNoteId = ActiveNote?.id;

  // Cortar el dictado al cambiar de nota: nunca escribir en otra nota
  useEffect(() => {
    cancelDictation();
  }, [activeNoteId, cancelDictation]);

  // Cortar el dictado si la app pasa a segundo plano
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) cancelDictation();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [cancelDictation]);

  // En modo "mantener presionado", perder el foco de la ventana equivale a soltar
  useEffect(() => {
    if (dictationMode !== "hold") return;
    window.addEventListener("blur", stopDictation);
    return () => window.removeEventListener("blur", stopDictation);
  }, [dictationMode, stopDictation]);

  const handleHoldEnd = (durationMs: number) => {
    stopDictation();
    if (durationMs < SHORT_TAP_MS) showHint("short-tap");
  };

  useEffect(() => {
    if (debouncedActiveNote) {
      saveUpdatesNotesOnDBorLocalStorage();
    }
  }, [debouncedActiveNote, saveUpdatesNotesOnDBorLocalStorage]);

  // Foco automático al abrir el buscador
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    setQuery("");
  }, [setQuery]);

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
  }, [isSearchOpen, handleCloseSearch]);

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
        <div className="new-thinking-wrapper">
          <textarea
            ref={textAreaRef}
            value={composeDraft(draft, interimText)}
            onChange={(e) => setDraft(stripInterim(e.target.value, interimText))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const text = composeDraft(draft, interimText).trim();
                if (text) handleNewThinking(text);
                setDraft("");
                // Lo que se siga dictando arranca una idea nueva, sin duplicados
                if (isDictating) resetSegment();
              }
            }}
            placeholder={
              isDictating && !draft
                ? "Escuchando…"
                : "Comienza a escribir tus ideas aqui :)"
            }
            className="thinking-input"
          />
          {isDictationSupported && (
            <DictationButton
              status={dictationStatus}
              onToggle={() =>
                isDictating ? stopDictation() : startDictation("toggle")
              }
              onHoldStart={() => startDictation("hold")}
              onHoldEnd={handleHoldEnd}
            />
          )}
        </div>
        {dictationMessage && (
          <p
            className={`dictation-message${dictationMessage.kind === "error" ? " is-error" : ""}`}
            role="status"
            aria-live="polite"
          >
            {dictationMessage.text}
          </p>
        )}
      </div>
    </>
  );
};

export default ActiveNoteView;
