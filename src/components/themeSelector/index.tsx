import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, Palette } from "lucide-react";
import useTheme from "@/hooks/useTheme";
import useSounds from "@/hooks/useSounds";
import type { ThemeId } from "@/components/utils/theme";
import "./styles.css";

interface ThemeSelectorProps {
  // Hacia dónde se abre el menú: arriba (pie del panel) o a la derecha
  // (cápsula del panel colapsado)
  placement?: "top" | "right";
}

// Botón con paleta que despliega los temas disponibles. Se cierra al elegir,
// al tocar afuera, con Escape o volviendo a tocar el botón.
const ThemeSelector = ({ placement = "top" }: ThemeSelectorProps) => {
  const { theme, themes, setTheme } = useTheme();
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

    // Al abrir, el foco va al tema activo
    const activeIndex = themes.findIndex((option) => option.id === theme);
    itemRefs.current[Math.max(activeIndex, 0)]?.focus();

    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        play("close");
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
    // Solo al abrir: no mover el foco si el tema cambia desde otra pestaña
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    play("select");
    close();
  };

  const focusItem = (index: number) => {
    const count = themes.length;
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
        focusItem(themes.length - 1);
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
    <div className="theme-selector" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="circular-button theme-selector-toggle"
        onClick={() => {
          play(isOpen ? "close" : "select");
          setIsOpen((prev) => !prev);
        }}
        title="Cambiar tema"
        aria-label="Cambiar tema"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        <Palette size={18} />
      </button>
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Temas"
          className={`theme-menu theme-menu--${placement}`}
          onKeyDown={handleMenuKeyDown}
        >
          {themes.map((option, index) => {
            const isActive = option.id === theme;
            return (
              <button
                key={option.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`theme-menu-item ${isActive ? "is-active" : ""}`}
                onClick={() => handleSelect(option.id)}
              >
                <span data-theme-preview={option.id} aria-hidden="true" />
                <span className="theme-menu-label">{option.label}</span>
                {isActive && (
                  <Check size={16} className="theme-menu-check" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;
