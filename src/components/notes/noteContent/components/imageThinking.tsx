import { useState } from "react";
import { ImageOff, LoaderCircle, X } from "lucide-react";
import type { Segment } from "@/hooks/useNoteSearch";
import { useImageUrls, type ImageUrlState } from "@/hooks/useImageUrls";
import { isLocalRef, type ImageRef, type ImageThinking } from "@/types/thinking";
import HighlightedText from "./highlightedText";
import ImageViewer from "./imageViewer";

interface ThumbProps {
  imageRef: ImageRef;
  state: ImageUrlState;
  label: string;
  onRetry: (ref: ImageRef) => void;
}

// Una miniatura con sus estados: cargando, lista o no disponible
const ImageThumb = ({ imageRef, state, label, onRetry }: ThumbProps) => {
  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);

  if (state.status === "loading") {
    return (
      <span className="image-thumb-placeholder" role="status" aria-label="Cargando imagen">
        <LoaderCircle size={18} className="loading-icon" />
      </span>
    );
  }
  if (state.status === "error" || failed || !state.url) {
    return (
      <span className="image-thumb-placeholder is-error">
        <ImageOff size={18} aria-hidden="true" />
        Imagen no disponible
      </span>
    );
  }
  return (
    <img
      src={state.url}
      alt={label}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => {
        // Una URL firmada puede haber vencido: se pide una nueva una sola vez
        if (!retried && !isLocalRef(imageRef)) {
          setRetried(true);
          onRetry(imageRef);
        } else {
          setFailed(true);
        }
      }}
    />
  );
};

interface Props {
  thinking: ImageThinking;
  segments?: Segment[];
  isEditing: boolean;
  onEditDone: (changes: { removedRefs: ImageRef[]; text: string }) => void;
  onEditCancel: () => void;
}

// Pensamiento con imágenes: miniaturas agrupadas, texto debajo y visor
// ampliado. En modo edición permite quitar imágenes y cambiar el texto.
const ImageThinkingView = ({
  thinking,
  segments,
  isEditing,
  onEditDone,
  onEditCancel,
}: Props) => {
  const refs = thinking.value;
  const { getState, refresh } = useImageUrls(refs);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [removed, setRemoved] = useState<ImageRef[]>([]);
  const [draftText, setDraftText] = useState(thinking.text ?? "");
  const [wasEditing, setWasEditing] = useState(isEditing);

  // Al entrar a editar se parte del estado guardado
  if (isEditing !== wasEditing) {
    setWasEditing(isEditing);
    if (isEditing) {
      setRemoved([]);
      setDraftText(thinking.text ?? "");
    }
  }

  const total = refs.length;
  const visible = isEditing ? refs.filter((r) => !removed.includes(r)) : refs;
  const label = (i: number) => `Imagen ${i + 1} de ${total}`;

  const confirmEdit = () =>
    onEditDone({ removedRefs: removed, text: draftText });

  return (
    <div className="image-thinking">
      {visible.length > 0 && (
        <div className={`image-grid count-${Math.min(visible.length, 5)}`}>
          {visible.map((ref) => {
            const i = refs.indexOf(ref);
            return (
              <div key={ref} className="image-grid-item">
                {isEditing ? (
                  <>
                    <ImageThumb
                      imageRef={ref}
                      state={getState(ref)}
                      label={label(i)}
                      onRetry={refresh}
                    />
                    <button
                      type="button"
                      className="image-tray-remove"
                      onClick={() => setRemoved((prev) => [...prev, ref])}
                      aria-label={`Quitar imagen ${i + 1}`}
                      title="Quitar imagen"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="image-thumb-btn"
                    onClick={() => setOpenIndex(i)}
                    aria-label={`Ver imagen ${i + 1} de ${total}`}
                  >
                    <ImageThumb
                      imageRef={ref}
                      state={getState(ref)}
                      label={label(i)}
                      onRetry={refresh}
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isEditing ? (
        <div className="image-thinking-edit">
          <textarea
            className="thinking-input"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Texto que acompaña a las imágenes (opcional)"
            aria-label="Texto del pensamiento"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                confirmEdit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onEditCancel();
              }
            }}
          />
          {visible.length === 0 && (
            <p className="image-thinking-hint">
              {draftText.trim()
                ? "Sin imágenes, quedará como una idea de solo texto."
                : "Sin imágenes ni texto, la idea se borrará."}
            </p>
          )}
          <div className="image-thinking-edit-actions">
            <button type="button" className="btn-secondary" onClick={onEditCancel}>
              Cancelar
            </button>
            <button type="button" className="btn-primary" onClick={confirmEdit}>
              Guardar
            </button>
          </div>
        </div>
      ) : (
        thinking.text && (
          <span className="thinking-text">
            {segments ? <HighlightedText segments={segments} /> : thinking.text}
          </span>
        )
      )}

      <ImageViewer
        images={refs.map((ref, i) => ({
          url: getState(ref).url,
          alt: label(i),
        }))}
        openIndex={openIndex}
        onClose={() => setOpenIndex(null)}
      />
    </div>
  );
};

export default ImageThinkingView;
