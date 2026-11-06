import { useNotes } from "@/hooks/useNotes";
import type { INotes, Thinking } from "@/types";
import {
  createTextThinking,
  isImageThinking,
  isTextThinking,
} from "@/types/thinking";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
} from "react";
import {
  ArrowUp,
  LoaderCircle,
  Check,
  Pencil,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useNoteSearch } from "@/hooks/useNoteSearch";
import { usePendingImages } from "@/hooks/usePendingImages";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import {
  appendTranscript,
  composeDraft,
  stripInterim,
} from "@/components/utils/dictation";
import { loadDraft, saveDraft } from "@/components/utils/drafts";
import DictationButton from "./dictationButton";
import NoteInfo from "./noteInfo";
import CopyButton from "./copyButton";
import DownloadMenu from "./downloadMenu";
import {
  formatNoteForCopy,
  thinkingToPlainText,
} from "@/components/utils/copyNote";
import {
  extractImageFiles,
  hasClipboardText,
  IMAGE_ERRORS,
} from "@/components/utils/imageProcessing";
import HighlightedText from "./highlightedText";
import ImagePreviewTray from "./imagePreviewTray";
import ImageThinkingView from "./imageThinking";

const formatIdeasCount = (count: number) =>
  count === 0 ? "Sin ideas" : `${count} idea${count === 1 ? "" : "s"}`;

// Un toque más corto que esto no cuenta como "mantener presionado"
const SHORT_TAP_MS = 300;

const ActiveNoteView = () => {
  const {
    activeNoteState,
    updateActiveNote,
    loadingSaveNote,
    saveUpdatesNotesOnDBorLocalStorage,
    setLoadingSaveNote,
    addImageThinking,
    editImageThinking,
    removeThinking,
  } = useNotes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedNote, setEditedNote] = useState<INotes | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const ActiveNote = activeNoteState;
  const activeNoteId = ActiveNote?.id;
  // Cada nota tiene su propio borrador: se recupera al abrirla
  const [draft, setDraft] = useState(() => loadDraft(activeNoteId));
  const [draftNoteId, setDraftNoteId] = useState(activeNoteId);
  if (draftNoteId !== activeNoteId) {
    setDraftNoteId(activeNoteId);
    setDraft(loadDraft(activeNoteId));
  }
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Si la lista está "pegada" al final, sigue ahí cuando crece (p. ej. al
  // terminar de cargar las miniaturas de la idea recién enviada)
  const stickToBottomRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedActiveNote = useDebounce(editedNote, 2000);
  // Imágenes sin enviar: cada nota tiene las suyas, como el borrador de texto
  const pendingImages = usePendingImages(activeNoteId);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Guardar el borrador mientras se escribe, para no perderlo al salir
  useEffect(() => {
    saveDraft(draftNoteId, draft);
  }, [draftNoteId, draft]);

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
    const updatedThinkings = [
      ...(ActiveNote?.thinkings || []),
      createTextThinking(newThinking),
    ];
    setEditedNote({ ...ActiveNote, thinkings: updatedThinkings } as INotes);
    updateActiveNote({ thinkings: updatedThinkings });
  };

  const composedDraft = composeDraft(draft, interimText);
  const hasImages = pendingImages.images.length > 0;
  const canSubmit =
    (composedDraft.trim().length > 0 || hasImages) &&
    !pendingImages.isProcessing &&
    !isSubmitting;

  const submitDraft = async () => {
    if (!canSubmit) return;
    const text = composedDraft.trim();

    if (hasImages) {
      // Imágenes + texto opcional → un único pensamiento
      setIsSubmitting(true);
      pendingImages.dismissError();
      try {
        const added = await addImageThinking(pendingImages.readyBlobs, text);
        if (added) {
          pendingImages.clear();
          setDraft("");
          if (isDictating) resetSegment();
        }
      } catch (error) {
        // La bandeja y el texto se conservan para reintentar
        pendingImages.setError(
          error instanceof Error ? error.message : IMAGE_ERRORS.unreadable,
        );
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    handleNewThinking(text);
    setDraft("");
    // Lo que se siga dictando arranca una idea nueva, sin duplicados
    if (isDictating) resetSegment();
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const { images, otherFiles } = extractImageFiles(e.clipboardData);
    if (images.length > 0) {
      e.preventDefault();
      pendingImages.addFiles(images);
    } else if (otherFiles.length > 0 && !hasClipboardText(e.clipboardData)) {
      e.preventDefault();
      pendingImages.setError(IMAGE_ERRORS.notImage);
    }
    // Sin archivos: se pega el texto como siempre
  };

  // El campo crece con el contenido hasta su altura máxima (CSS); después scrollea
  useLayoutEffect(() => {
    const el = textAreaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [composedDraft]);

  const scrollListToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickToBottomRef.current = true;
  };

  // Al agregar una idea a la nota abierta, se lleva la lista al final para
  // verla (no al abrir la nota ni al cambiar de nota)
  const thinkingsCount = ActiveNote?.thinkings.length ?? 0;
  const lastCountRef = useRef({ noteId: activeNoteId, count: thinkingsCount });
  useLayoutEffect(() => {
    const last = lastCountRef.current;
    lastCountRef.current = { noteId: activeNoteId, count: thinkingsCount };
    if (last.noteId === activeNoteId && thinkingsCount > last.count) {
      scrollListToBottom();
    }
  }, [activeNoteId, thinkingsCount]);

  const handleListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const handleImageLoad = () => {
    if (stickToBottomRef.current) scrollListToBottom();
  };

  const handleDeleteThinking = (thinkingId: string) => {
    if (editingId === thinkingId) setEditingId(null);
    removeThinking(thinkingId);
  };

  const replaceThinking = (thinkingId: string, next: Thinking) =>
    ActiveNote?.thinkings.map((t) => (t.id === thinkingId ? next : t)) || [];

  return (
    <>
      <div className="note-toolbar">
        <div className="save-status" role="status" aria-live="polite">
          {loadingSaveNote ? (
            <>
              <LoaderCircle size={14} className="loading-icon" />
              Guardando…
            </>
          ) : (
            <>
              <Check size={14} className="check-icon" />
              Guardado
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{formatIdeasCount(ActiveNote?.thinkings.length ?? 0)}</span>
        </div>
        <div className="title-actions">
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="action-btn search-toggle"
            title="Buscar (Ctrl+F)"
            aria-pressed={isSearchOpen}
          >
            <Search size={17} />
          </button>
          <CopyButton
            getText={() => (ActiveNote ? formatNoteForCopy(ActiveNote) : "")}
            label="Copiar nota"
            size={17}
          />
          <DownloadMenu note={ActiveNote} />
          <NoteInfo
            key={activeNoteId}
            createdAt={ActiveNote?.createdAt}
            updatedAt={ActiveNote?.updatedAt}
          />
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

      <div className="note-heading">
        <input
          type="text"
          value={ActiveNote?.title || ""}
          onChange={(e) => handleUpdateActiveNote({ title: e.target.value })}
          placeholder="Sin título"
          className="title-input"
          aria-label="Título de la nota"
        />
      </div>

      <div className="thinking-list">
        <div
          className="thinkings-container"
          ref={listRef}
          onScroll={handleListScroll}
        >
          {ActiveNote?.thinkings.map((thinking) => {
            const segments = matchMap.get(thinking.id);
            const hasMatch = !!segments;

            if (!isTextThinking(thinking)) {
              const isImage = isImageThinking(thinking);
              return (
                <div
                  key={thinking.id}
                  className={`thinking-text-container${isImage ? " is-image" : ""}${hasMatch ? " thinking-has-match" : ""}`}
                >
                  {isImage ? (
                    <ImageThinkingView
                      thinking={thinking}
                      segments={segments}
                      isEditing={editingId === thinking.id}
                      onEditDone={(changes) => {
                        editImageThinking(thinking.id, changes);
                        setEditingId(null);
                      }}
                      onEditCancel={() => setEditingId(null)}
                      onImageLoad={handleImageLoad}
                    />
                  ) : (
                    <span className="thinking-text thinking-unsupported">
                      Contenido no soportado en esta versión
                    </span>
                  )}
                  <div className="thinking-actions">
                    {isImage && (
                      <>
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setEditingId((prev) =>
                              prev === thinking.id ? null : thinking.id,
                            );
                          }}
                          className="action-btn edit"
                          title="Editar"
                          aria-label="Editar idea"
                        >
                          <Pencil size={14} />
                        </button>
                        <CopyButton
                          getText={() => thinkingToPlainText(thinking)}
                          label="Copiar idea"
                          size={14}
                        />
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteThinking(thinking.id)}
                      className="action-btn delete"
                      title="Borrar"
                      aria-label="Borrar idea"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={thinking.id}
                className={`thinking-text-container${hasMatch ? " thinking-has-match" : ""}`}
              >
                {editingId === thinking.id ? (
                  <textarea
                    className="thinking-input"
                    defaultValue={thinking.value}
                    autoFocus
                    ref={(el) => {
                      if (el) {
                        const length = el.value.length;
                        el.setSelectionRange(length, length);
                      }
                    }}
                    onBlur={(e) => {
                      handleUpdateActiveNote({
                        thinkings: replaceThinking(thinking.id, {
                          ...thinking,
                          value: e.target.value,
                        }),
                      });
                      setEditingId(null);
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
                      thinking.value
                    )}
                  </span>
                )}
                {/* Siempre en el layout (ocupan su lugar) y se muestran al pasar el mouse:
                    así nunca tapan el texto de la idea */}
                <div className="thinking-actions">
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setEditingId((prev) =>
                        prev === thinking.id ? null : thinking.id,
                      );
                    }}
                    className="action-btn edit"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <CopyButton
                    getText={() => thinking.value}
                    label="Copiar idea"
                    size={14}
                  />
                  <button
                    onClick={() => handleDeleteThinking(thinking.id)}
                    className="action-btn delete"
                    title="Borrar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="composer-hint">
          Enter para agregar · Shift+Enter salto de línea
        </p>
        <div
          className={`composer${hasImages ? " has-images" : ""}`}
          // Tocar cualquier parte del recuadro enfoca el campo de texto
          onClick={(e) => {
            if (e.target === e.currentTarget) textAreaRef.current?.focus();
          }}
        >
          <ImagePreviewTray
            images={pendingImages.images}
            onRemove={pendingImages.remove}
            disabled={isSubmitting}
          />
          <textarea
            ref={textAreaRef}
            rows={1}
            value={composedDraft}
            onChange={(e) =>
              setDraft(stripInterim(e.target.value, interimText))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submitDraft();
              }
            }}
            onPaste={handlePaste}
            placeholder={
              isDictating && !draft ? "Escuchando…" : "Escribí una idea…"
            }
            aria-label="Nueva idea"
            className="composer-input"
          />
          <div className="composer-actions">
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
            <button
              type="button"
              className={`composer-send${canSubmit ? "" : " is-empty"}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void submitDraft()}
              aria-disabled={!canSubmit}
              aria-busy={isSubmitting}
              title="Agregar idea (Enter)"
              aria-label="Agregar idea"
            >
              {isSubmitting ? (
                <LoaderCircle size={18} className="loading-icon" />
              ) : (
                <ArrowUp size={18} />
              )}
            </button>
          </div>
        </div>
        {pendingImages.error && (
          <p className="dictation-message is-error" role="alert">
            {pendingImages.error}
          </p>
        )}
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
