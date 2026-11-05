import { useRef } from "react";
import type { PointerEvent } from "react";
import { Mic } from "lucide-react";
import type { DictationStatus } from "@/types/speech";

interface DictationButtonProps {
  status: DictationStatus;
  /** Clic con mouse/lápiz o teclado: alterna el dictado. */
  onToggle: () => void;
  /** Presión táctil sostenida: empieza a dictar. */
  onHoldStart: () => void;
  /** Fin de la presión táctil (soltar, cancelar o salir del botón). */
  onHoldEnd: (durationMs: number) => void;
}

// El modo se decide por cómo se interactúa (no por el dispositivo):
// dedo → mantener presionado; mouse, lápiz o teclado → toggle.
const DictationButton = ({
  status,
  onToggle,
  onHoldStart,
  onHoldEnd,
}: DictationButtonProps) => {
  const isListening = status === "listening";
  const holdStartRef = useRef<number | null>(null);
  // El navegador dispara un click después de un toque: hay que ignorarlo
  const ignoreNextClickRef = useRef(false);

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "touch") {
      ignoreNextClickRef.current = false;
      return;
    }
    e.preventDefault();
    // En táctil el puntero queda capturado por el botón y no se dispara
    // pointerleave; se libera para detectar cuando el dedo sale del botón.
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    ignoreNextClickRef.current = true;
    holdStartRef.current = performance.now();
    onHoldStart();
  };

  const handleHoldEnd = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "touch" || holdStartRef.current === null) return;
    const duration = performance.now() - holdStartRef.current;
    holdStartRef.current = null;
    onHoldEnd(duration);
    // Si el dedo salió del botón no llega ningún click: no bloquear el próximo
    window.setTimeout(() => {
      ignoreNextClickRef.current = false;
    }, 500);
  };

  const handleClick = () => {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      return;
    }
    onToggle();
  };

  return (
    <button
      type="button"
      className={`action-btn dictation-btn${isListening ? " is-listening" : ""}`}
      aria-label="Dictar por voz"
      aria-pressed={isListening}
      title="Dictar por voz"
      // Que el clic no le saque el foco al campo de texto
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerUp={handleHoldEnd}
      onPointerCancel={handleHoldEnd}
      onPointerLeave={handleHoldEnd}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Mic size={18} />
    </button>
  );
};

export default DictationButton;
