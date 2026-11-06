import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface ViewerImage {
  url?: string;
  alt: string;
}

interface Props {
  images: ViewerImage[];
  /** Índice de la imagen abierta; `null` = cerrado. */
  openIndex: number | null;
  onClose: () => void;
}

const SWIPE_THRESHOLD_PX = 50;

// Visor ampliado sobre <dialog> nativo: foco atrapado y Escape incluidos.
// Navega entre las imágenes del mismo pensamiento con botones, flechas o
// deslizando en pantallas táctiles.
const ImageViewer = ({ images, openIndex, onClose }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(openIndex ?? 0);
  const [prevOpenIndex, setPrevOpenIndex] = useState(openIndex);
  const swipeStartX = useRef<number | null>(null);

  // Al abrir en otra imagen, se arranca desde esa
  if (openIndex !== prevOpenIndex) {
    setPrevOpenIndex(openIndex);
    if (openIndex !== null) setIndex(openIndex);
  }

  const isOpen = openIndex !== null;
  const total = images.length;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      // jsdom no implementa showModal
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const go = (delta: number) => setIndex((i) => (i + delta + total) % total);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (total < 2) return;
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  };

  const handlePointerDown = (e: PointerEvent) => {
    swipeStartX.current = e.clientX;
  };
  const handlePointerUp = (e: PointerEvent) => {
    const start = swipeStartX.current;
    swipeStartX.current = null;
    if (start === null || total < 2) return;
    const delta = e.clientX - start;
    if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) go(delta < 0 ? 1 : -1);
  };

  const current = images[index];

  return (
    <dialog
      ref={dialogRef}
      className="image-viewer"
      aria-label="Imagen ampliada"
      // Escape dispara "cancel"; se cierra desde el estado del padre
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={() => {
        if (isOpen) onClose();
      }}
      onKeyDown={handleKeyDown}
      // Un clic en el fondo (fuera de la imagen y los controles) cierra
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {isOpen && current && (
        <>
          <div
            className="image-viewer-stage"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            {current.url ? (
              <img src={current.url} alt={current.alt} draggable={false} />
            ) : (
              <p className="image-unavailable">Imagen no disponible</p>
            )}
          </div>
          <button
            type="button"
            className="image-viewer-btn image-viewer-close"
            onClick={onClose}
            aria-label="Cerrar"
            autoFocus
          >
            <X size={20} />
          </button>
          {total > 1 && (
            <>
              <button
                type="button"
                className="image-viewer-btn image-viewer-prev"
                onClick={() => go(-1)}
                aria-label="Imagen anterior"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                className="image-viewer-btn image-viewer-next"
                onClick={() => go(1)}
                aria-label="Imagen siguiente"
              >
                <ChevronRight size={24} />
              </button>
              <span className="image-viewer-counter" aria-live="polite">
                {index + 1} / {total}
              </span>
            </>
          )}
        </>
      )}
    </dialog>
  );
};

export default ImageViewer;
