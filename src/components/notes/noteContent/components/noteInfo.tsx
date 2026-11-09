import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import useSounds from "@/hooks/useSounds";
import { formatNoteDate, formatRelativeNoteDate } from "@/components/utils/dates";

const UNAVAILABLE = "No disponible";
const HOVER_OPEN_DELAY = 300;
const HOVER_CLOSE_DELAY = 150;
const TICK = 30_000;

// Línea suave bajo el título ("Editada hace 2 horas") que despliega las fechas
// completas. Con mouse se abre al pasar por encima; con un toque o clic queda
// fija hasta tocar afuera o apretar Escape.
const NoteInfo = ({
  createdAt,
  updatedAt,
}: {
  createdAt?: string;
  updatedAt?: string;
}) => {
  // "hover": abierto por pasar el mouse (se cierra al salir).
  // "pinned": abierto por clic o toque (se cierra al tocar afuera o con Escape).
  const [mode, setMode] = useState<"closed" | "hover" | "pinned">("closed");
  const [now, setNow] = useState(() => Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const popoverId = useId();
  const isOpen = mode !== "closed";

  const { play } = useSounds();

  // Mantiene el tiempo relativo al día sin depender de otros renders
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  useEffect(() => {
    if (mode !== "pinned") return;
    const closeMenu = () => {
      setMode("closed");
      play("close");
    };
    const handlePointerDown = (e: globalThis.PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) closeMenu();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode, play]);

  // Escape también cierra lo abierto con el mouse, sin sonido
  useEffect(() => {
    if (mode !== "hover") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("closed");
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mode]);

  // Sin fechas no hay nada que mostrar. Si falta la de edición, se usa la de creación.
  const relative = updatedAt
    ? formatRelativeNoteDate(updatedAt, now)
    : formatRelativeNoteDate(createdAt, now);
  if (!relative) return null;
  const label = `${updatedAt ? "Editada" : "Creada"} ${relative}`;

  const scheduleHover = (next: "hover" | "closed", delay: number) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(
      () => setMode((prev) => (prev === "pinned" ? prev : next)),
      delay,
    );
  };

  const handlePointerEnter = (e: PointerEvent) => {
    if (e.pointerType === "mouse") scheduleHover("hover", HOVER_OPEN_DELAY);
  };

  const handlePointerLeave = (e: PointerEvent) => {
    if (e.pointerType === "mouse") scheduleHover("closed", HOVER_CLOSE_DELAY);
  };

  // Un clic sobre lo abierto por hover lo fija. Uno sobre lo fijado lo cierra.
  const toggle = () => {
    window.clearTimeout(hoverTimer.current);
    if (mode === "pinned") {
      play("close");
      setMode("closed");
    } else {
      play("select");
      setMode("pinned");
    }
  };

  return (
    <div
      className="note-info note-meta"
      ref={containerRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <button
        type="button"
        onClick={toggle}
        className="note-meta-toggle"
        aria-label={`${label}. Ver fechas de la nota`}
        aria-expanded={isOpen}
        aria-controls={popoverId}
      >
        {label}
      </button>
      {isOpen && (
        <div id={popoverId} className="note-info-popover note-meta-popover">
          <dl>
            <div>
              <dt>Creada</dt>
              <dd>{formatNoteDate(createdAt) ?? UNAVAILABLE}</dd>
            </div>
            <div>
              <dt>Última modificación</dt>
              <dd>{formatNoteDate(updatedAt) ?? UNAVAILABLE}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
};

export default NoteInfo;
