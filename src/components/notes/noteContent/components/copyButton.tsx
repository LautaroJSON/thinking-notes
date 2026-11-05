import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

const FEEDBACK_MS = 1500;

// Botón genérico que copia un texto al portapapeles y muestra un ✓ al lograrlo.
// `getText` se evalúa recién al hacer clic.
const CopyButton = ({
  getText,
  label,
  size = 18,
  className = "",
}: {
  getText: () => string;
  label: string;
  size?: number;
  className?: string;
}) => {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setStatus("copied");
    } catch (error) {
      console.error("No se pudo copiar:", error);
      setStatus("error");
    }
  };

  const currentLabel =
    status === "copied"
      ? "¡Copiado!"
      : status === "error"
        ? "No se pudo copiar"
        : label;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`action-btn copy-btn${status === "copied" ? " is-copied" : ""} ${className}`.trim()}
      title={currentLabel}
      aria-label={currentLabel}
    >
      {status === "copied" ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
};

export default CopyButton;
