import { LoaderCircle, X } from "lucide-react";
import type { PendingImage } from "@/hooks/usePendingImages";

interface Props {
  images: PendingImage[];
  onRemove: (localId: string) => void;
  disabled?: boolean;
}

// Miniaturas de las imágenes pegadas que todavía no se enviaron
const ImagePreviewTray = ({ images, onRemove, disabled }: Props) => {
  if (images.length === 0) return null;

  return (
    <ul className="image-tray" aria-label="Imágenes a adjuntar">
      {images.map((image, index) => (
        <li key={image.localId} className="image-tray-item">
          {image.status === "ready" && image.previewUrl ? (
            <img src={image.previewUrl} alt={`Imagen ${index + 1}`} />
          ) : (
            <span
              className="image-tray-placeholder"
              role="status"
              aria-label={`Procesando imagen ${index + 1}`}
            >
              <LoaderCircle size={18} className="loading-icon" />
            </span>
          )}
          <button
            type="button"
            className="image-tray-remove"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onRemove(image.localId)}
            disabled={disabled}
            aria-label={`Quitar imagen ${index + 1}`}
            title="Quitar imagen"
          >
            <X size={12} />
          </button>
        </li>
      ))}
    </ul>
  );
};

export default ImagePreviewTray;
