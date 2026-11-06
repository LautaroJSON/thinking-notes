import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Volume2, VolumeX } from "lucide-react";
import useSounds from "@/hooks/useSounds";
import { SOUND_CATEGORIES } from "@/components/utils/sounds";
import "./styles.css";

interface SoundSelectorProps {
  // Hacia dónde se abre el menú: arriba (pie del panel) o a la derecha
  placement?: "top" | "right";
}

// Botón con parlante que despliega los interruptores de sonido: uno general y
// uno por categoría. Cambiar un interruptor no cierra el menú; se cierra al
// tocar afuera, con Escape, con Tab o volviendo a tocar el botón.
const SoundSelector = ({ placement = "top" }: SoundSelectorProps) => {
  const { prefs, setEnabled, setCategory, play } = useSounds();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const isMuted =
    !prefs.enabled || SOUND_CATEGORIES.every((category) => !prefs[category.id]);

  const close = ({ focusButton = true } = {}) => {
    setIsOpen(false);
    play("close");
    if (focusButton) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;

    // Al abrir, el foco va al interruptor general
    itemRefs.current[0]?.focus();

    const handlePointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        play("close");
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, play]);

  const handleToggleMenu = () => {
    if (isOpen) {
      close({ focusButton: false });
    } else {
      play("select");
      setIsOpen(true);
    }
  };

  const handleToggleEnabled = () => {
    const next = !prefs.enabled;
    setEnabled(next);
    if (next) play("select");
  };

  const itemCount = SOUND_CATEGORIES.length + 1;

  const focusItem = (index: number) => {
    itemRefs.current[(index + itemCount) % itemCount]?.focus();
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
        focusItem(itemCount - 1);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close({ focusButton: false });
        break;
    }
  };

  const label = isMuted ? "Sonidos (silenciados)" : "Sonidos";

  return (
    <div className="sound-selector" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="circular-button sound-selector-toggle"
        onClick={handleToggleMenu}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-label="Sonidos"
          className={`sound-menu sound-menu--${placement}`}
          onKeyDown={handleMenuKeyDown}
        >
          <button
            ref={(el) => {
              itemRefs.current[0] = el;
            }}
            type="button"
            role="menuitemcheckbox"
            aria-checked={prefs.enabled}
            tabIndex={0}
            className="sound-menu-item sound-menu-item--main"
            onClick={handleToggleEnabled}
          >
            <span className="sound-menu-label">Sonidos</span>
            <span className="sound-switch" aria-hidden="true" />
          </button>
          <div className="sound-menu-separator" role="separator" />
          {SOUND_CATEGORIES.map((category, index) => {
            const isOn = prefs[category.id];
            return (
              <button
                key={category.id}
                ref={(el) => {
                  itemRefs.current[index + 1] = el;
                }}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isOn}
                tabIndex={-1}
                className={`sound-menu-item ${prefs.enabled ? "" : "is-dimmed"}`}
                onClick={() => setCategory(category.id, !isOn)}
              >
                <span className="sound-menu-label">{category.label}</span>
                <span className="sound-switch" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SoundSelector;
