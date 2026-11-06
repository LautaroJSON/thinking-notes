import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Maximize2,
  Palette,
  Sparkles,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import useSounds from "@/hooks/useSounds";
import {
  SECTION_TITLES,
  useSectionValues,
  type CustomizeSection,
} from "./sections";
import {
  AnimationOptions,
  BulletOptions,
  SoundOptions,
  ThemeOptions,
} from "./options";
import CustomizeModal from "./customizeModal";
import "./styles.css";

const SECTIONS: { id: CustomizeSection; label: string; icon: LucideIcon }[] = [
  { id: "theme", label: "Tema", icon: Palette },
  { id: "bullet", label: "Decorado", icon: List },
  { id: "animation", label: "Animación", icon: Sparkles },
  { id: "sound", label: "Sonidos", icon: Volume2 },
];

const SECTION_OPTIONS: Record<CustomizeSection, ComponentType> = {
  theme: ThemeOptions,
  bullet: BulletOptions,
  animation: AnimationOptions,
  sound: SoundOptions,
};

// Botón único de personalización: abre un menú con una fila por sección
// («Tema · Clásico ›»); cada fila se desliza a sus opciones y la flecha
// vuelve. El ícono de la esquina abre todo en una ventana con vista previa.
const CustomizeMenu = () => {
  const { play } = useSounds();
  const values = useSectionValues();
  const [isOpen, setIsOpen] = useState(false);
  const [section, setSection] = useState<CustomizeSection | null>(null);
  // Hacia dónde entra la página nueva: adelante (subpágina) o atrás
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Fila que abrió la subpágina, para devolverle el foco al volver
  const returnFocusRef = useRef<CustomizeSection | null>(null);
  const panelId = useId();

  const close = ({ focusButton = true } = {}) => {
    setIsOpen(false);
    setSection(null);
    play("close");
    if (focusButton) buttonRef.current?.focus();
  };

  // Al abrir o cambiar de página, el foco va a la primera opción (al volver,
  // a la fila de la sección de la que se venía)
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    const target =
      !section && returnFocusRef.current
        ? panel.querySelector<HTMLElement>(
            `[data-section="${returnFocusRef.current}"]`,
          )
        : panel.querySelector<HTMLElement>(".custom-options button");
    target?.focus();
    if (!section) returnFocusRef.current = null;
  }, [isOpen, section]);

  // Tocar afuera cierra el menú
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        setSection(null);
        play("close");
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, play]);

  const openSection = (id: CustomizeSection) => {
    returnFocusRef.current = id;
    setDirection("forward");
    setSection(id);
    play("select");
  };

  const goBack = () => {
    setDirection("back");
    setSection(null);
  };

  const openModal = () => {
    setIsOpen(false);
    setSection(null);
    setIsModalOpen(true);
    play("select");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    // Escape primero vuelve atrás y después cierra
    if (section) goBack();
    else close();
  };

  const Options = section ? SECTION_OPTIONS[section] : null;

  return (
    <div className="customize" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="circular-button customize-toggle"
        onClick={() => {
          if (isOpen) {
            close({ focusButton: false });
          } else {
            play("select");
            setIsOpen(true);
          }
        }}
        title="Personalizar"
        aria-label="Personalizar"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <Palette size={18} />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label="Personalizar"
          className="customize-panel"
          onKeyDown={handleKeyDown}
        >
          <div
            key={section ?? "root"}
            className={`customize-page customize-page--${direction}`}
          >
            <div className="customize-header">
              {section ? (
                <button
                  type="button"
                  className="customize-back"
                  onClick={goBack}
                  aria-label={`Volver a Personalizar (${SECTION_TITLES[section]})`}
                >
                  <ChevronLeft size={18} aria-hidden />
                  <span>{SECTION_TITLES[section]}</span>
                </button>
              ) : (
                <h2 className="customize-title">Personalizar</h2>
              )}
              <button
                type="button"
                className="customize-expand"
                onClick={openModal}
                title="Abrir en ventana"
                aria-label="Abrir Personalizar en una ventana"
              >
                <Maximize2 size={15} aria-hidden />
              </button>
            </div>

            {Options ? (
              <Options />
            ) : (
              <div className="custom-options">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    data-section={id}
                    className="customize-row"
                    onClick={() => openSection(id)}
                  >
                    <span className="customize-row-icon" aria-hidden="true">
                      <Icon size={15} />
                    </span>
                    <span className="customize-row-label">{label}</span>
                    <span className="customize-row-value">{values[id]}</span>
                    <ChevronRight
                      size={16}
                      className="customize-row-chevron"
                      aria-hidden
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <CustomizeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          play("close");
          buttonRef.current?.focus();
        }}
      />
    </div>
  );
};

export default CustomizeMenu;
