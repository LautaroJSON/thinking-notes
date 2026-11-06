import { useEffect, useRef } from "react";
import { Play, X } from "lucide-react";
import useNoteAnimation from "@/hooks/useNoteAnimation";
import { openAnimation } from "@/components/utils/noteLaunch";
import {
  AnimationOptions,
  BulletOptions,
  SoundOptions,
  ThemeOptions,
} from "./options";
import { SECTION_TITLES } from "./sections";

const SAMPLE_IDEAS = [
  "Probar la app con usuarios reales antes de agregar más funciones",
  "El dictado por voz anda bien, pero se corta si hay silencio largo",
  "Idea: poder fijar una nota arriba de todo",
  "Revisar los colores del tema oscuro",
];

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

interface CustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Ventana de Personalizar: todas las opciones juntas y, en pantallas
// anchas, una nota de ejemplo que muestra los cambios en vivo. En el celular
// se abre como una hoja desde abajo, sin vista previa.
const CustomizeModal = ({ isOpen, onClose }: CustomizeModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const { animation } = useNoteAnimation();
  const lastAnimationRef = useRef(animation);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      // jsdom no implementa showModal
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [isOpen]);

  // La nota de ejemplo entra con la animación elegida, desde su tarjeta
  const playPreview = () => {
    const note = noteRef.current;
    const card = cardRef.current;
    if (!note || !card || typeof note.animate !== "function") return;
    if (prefersReducedMotion()) return;
    note.getAnimations().forEach((running) => running.cancel());
    const preview = openAnimation(animation, {
      card: card.getBoundingClientRect(),
      panel: note.getBoundingClientRect(),
      radius: parseFloat(getComputedStyle(note).borderTopLeftRadius) || 0,
    });
    if (!preview) return;
    note.style.transformOrigin = preview.transformOrigin;
    note.animate(preview.keyframes, preview.options);
  };

  // Al elegir otra animación, se reproduce sola
  useEffect(() => {
    if (lastAnimationRef.current === animation) return;
    lastAnimationRef.current = animation;
    if (isOpen) playPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation]);

  return (
    <dialog
      ref={dialogRef}
      className="customize-modal"
      aria-labelledby="customize-modal-title"
      // Escape y el botón de cerrar pasan por acá
      onClose={() => isOpen && onClose()}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // Tocar el fondo oscurecido cierra
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {isOpen && (
        <div className="customize-modal-body">
          <div className="customize-modal-options">
            <div className="customize-modal-header">
              <h2 id="customize-modal-title">Personalizar</h2>
              <button
                type="button"
                className="customize-modal-close"
                onClick={onClose}
                aria-label="Cerrar"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <section>
              <h3>{SECTION_TITLES.theme}</h3>
              <ThemeOptions />
            </section>
            <section>
              <h3>{SECTION_TITLES.bullet}</h3>
              <BulletOptions />
            </section>
            <section>
              <h3>{SECTION_TITLES.animation}</h3>
              <AnimationOptions />
            </section>
            <section>
              <h3>{SECTION_TITLES.sound}</h3>
              <SoundOptions />
            </section>
          </div>

          <div className="customize-preview">
            <p className="customize-preview-label">Vista previa</p>
            <div className="customize-preview-stage" aria-hidden="true">
              <div ref={cardRef} className="customize-preview-card">
                Nueva Nota :)
              </div>
              <div ref={noteRef} className="customize-preview-note">
                <p className="customize-preview-title">Nueva Nota :)</p>
                <div className="thinkings-container">
                  {SAMPLE_IDEAS.map((idea) => (
                    <div key={idea} className="thinking-text-container">
                      <span className="thinking-text">{idea}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="customize-preview-play"
              onClick={playPreview}
            >
              <Play size={14} aria-hidden />
              Ver animación
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
};

export default CustomizeModal;
