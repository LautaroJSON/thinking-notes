import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Sparkles } from "lucide-react";
import useNoteAnimation from "@/hooks/useNoteAnimation";
import useSounds from "@/hooks/useSounds";
import type { NoteAnimationId } from "@/components/utils/noteAnimation";
import "./styles.css";

interface AnimationSelectorProps {
  // Hacia dónde se abre el menú: arriba (pie del panel) o a la derecha
  placement?: "top" | "right";
}

// Botón con destellos que despliega las animaciones para abrir y cerrar las
// notas, como opciones de radio. Se cierra al elegir, al tocar afuera, con
// Escape o volviendo a tocar el botón.
const AnimationSelector = ({ placement = "top" }: AnimationSelectorProps) => {
  const { animation, animations, setNoteAnimation } = useNoteAnimation();
  const { play } = useSounds();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const close = ({ focusButton = true } = {}) => {
    setIsOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;

    // Al abrir, el foco va a la animación elegida
    const activeIndex = animations.findIndex(
      (option) => option.id === animation,
    );
    itemRefs.current[Math.max(activeIndex, 0)]?.focus();

    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        play("close");
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
    // Solo al abrir: no mover el foco si la preferencia cambia en otra pestaña
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSelect = (id: NoteAnimationId) => {
    setNoteAnimation(id);
    play("select");
    close();
  };

  const focusItem = (index: number) => {
    const count = animations.length;
    itemRefs.current[(index + count) % count]?.focus();
  };

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = itemRefs.current.findIndex(
      (item) => item === document.activeElement,
    );

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(animations.length - 1);
        break;
      case "Escape":
        e.preventDefault();
        play("close");
        close();
        break;
      case "Tab":
        play("close");
        close({ focusButton: false });
        break;
    }
  };

  return (
    <div className="animation-selector" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="circular-button animation-selector-toggle"
        onClick={() => {
          play(isOpen ? "close" : "select");
          setIsOpen((prev) => !prev);
        }}
        title="Animación de las notas"
        aria-label="Animación de las notas"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        <Sparkles size={18} />
      </button>
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Animación de las notas"
          className={`animation-menu animation-menu--${placement}`}
          onKeyDown={handleMenuKeyDown}
        >
          <p className="animation-menu-title" aria-hidden="true">
            Al abrir y cerrar notas
          </p>
          {animations.map((option, index) => {
            const isActive = option.id === animation;
            return (
              <button
                key={option.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                aria-labelledby={`${menuId}-${option.id}`}
                aria-describedby={`${menuId}-${option.id}-description`}
                tabIndex={isActive ? 0 : -1}
                className={`animation-menu-item ${isActive ? "is-active" : ""}`}
                onClick={() => handleSelect(option.id)}
              >
                <span className="animation-radio" aria-hidden="true" />
                <span className="animation-menu-text">
                  <span
                    id={`${menuId}-${option.id}`}
                    className="animation-menu-label"
                  >
                    {option.label}
                  </span>
                  <span
                    id={`${menuId}-${option.id}-description`}
                    className="animation-menu-description"
                  >
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnimationSelector;
