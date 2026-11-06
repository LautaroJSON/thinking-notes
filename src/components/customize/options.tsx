import { Check } from "lucide-react";
import useTheme from "@/hooks/useTheme";
import useSounds from "@/hooks/useSounds";
import useNoteAnimation from "@/hooks/useNoteAnimation";
import useThinkingBullet from "@/hooks/useThinkingBullet";
import { SOUND_CATEGORIES } from "@/components/utils/sounds";
import type { ThinkingBulletId } from "@/components/utils/thinkingBullet";

/*
  Grupos de opciones de Personalizar. Se usan igual en el menú (cada uno en
  su subpágina) y en la ventana (todos juntos). Cada cambio se aplica al
  instante.
*/

export const ThemeOptions = () => {
  const { theme, themes, setTheme } = useTheme();
  const { play } = useSounds();

  return (
    <div role="radiogroup" aria-label="Tema" className="custom-options">
      {themes.map((option) => {
        const isActive = option.id === theme;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            className="custom-option"
            onClick={() => {
              setTheme(option.id);
              play("select");
            }}
          >
            <span data-theme-preview={option.id} aria-hidden="true" />
            <span className="custom-option-label">{option.label}</span>
            {isActive && (
              <Check size={16} className="custom-option-check" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
};

// Muestra en miniatura de cada decorado
const BulletGlyph = ({ id }: { id: ThinkingBulletId }) => (
  <span className={`bullet-glyph bullet-glyph--${id}`} aria-hidden="true">
    {id === "number" ? "1" : null}
  </span>
);

export const BulletOptions = () => {
  const { bullet, bullets, setThinkingBullet } = useThinkingBullet();
  const { play } = useSounds();

  return (
    <div
      role="radiogroup"
      aria-label="Decorado de las ideas"
      className="custom-options"
    >
      {bullets.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={option.id === bullet}
          className="custom-option"
          onClick={() => {
            setThinkingBullet(option.id);
            play("select");
          }}
        >
          <BulletGlyph id={option.id} />
          <span className="custom-option-text">
            <span className="custom-option-label">{option.label}</span>
            <span className="custom-option-description">
              {option.description}
            </span>
          </span>
          <span className="custom-radio" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
};

export const AnimationOptions = () => {
  const { animation, animations, setNoteAnimation } = useNoteAnimation();
  const { play } = useSounds();

  return (
    <div
      role="radiogroup"
      aria-label="Animación de las notas"
      className="custom-options"
    >
      {animations.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={option.id === animation}
          className="custom-option"
          onClick={() => {
            setNoteAnimation(option.id);
            play("select");
          }}
        >
          <span className="custom-option-text">
            <span className="custom-option-label">{option.label}</span>
            <span className="custom-option-description">
              {option.description}
            </span>
          </span>
          <span className="custom-radio" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
};

export const SoundOptions = () => {
  const { prefs, setEnabled, setCategory, play } = useSounds();

  return (
    <div role="group" aria-label="Sonidos" className="custom-options">
      <button
        type="button"
        role="switch"
        aria-checked={prefs.enabled}
        className="custom-option custom-option--main"
        onClick={() => {
          const next = !prefs.enabled;
          setEnabled(next);
          if (next) play("select");
        }}
      >
        <span className="custom-option-label">Sonidos</span>
        <span className="custom-switch" aria-hidden="true" />
      </button>
      {SOUND_CATEGORIES.map((category) => {
        const isOn = prefs[category.id];
        return (
          <button
            key={category.id}
            type="button"
            role="switch"
            aria-checked={isOn}
            // Con el general apagado se ven atenuadas pero se pueden cambiar
            className={`custom-option ${prefs.enabled ? "" : "is-dimmed"}`}
            onClick={() => setCategory(category.id, !isOn)}
          >
            <span className="custom-option-label">{category.label}</span>
            <span className="custom-switch" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
};
