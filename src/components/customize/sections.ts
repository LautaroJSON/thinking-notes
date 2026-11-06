import useTheme from "@/hooks/useTheme";
import useSounds from "@/hooks/useSounds";
import useNoteAnimation from "@/hooks/useNoteAnimation";
import useThinkingBullet from "@/hooks/useThinkingBullet";
import { SOUND_CATEGORIES } from "@/components/utils/sounds";

// Secciones de Personalizar

export type CustomizeSection = "theme" | "bullet" | "animation" | "sound";

export const SECTION_TITLES: Record<CustomizeSection, string> = {
  theme: "Tema",
  bullet: "Decorado de las ideas",
  animation: "Animación de las notas",
  sound: "Sonidos",
};

// Valor elegido de cada sección, para mostrarlo en el menú
export const useSectionValues = (): Record<CustomizeSection, string> => {
  const { theme, themes } = useTheme();
  const { bullet, bullets } = useThinkingBullet();
  const { animation, animations } = useNoteAnimation();
  const { prefs } = useSounds();
  const isMuted =
    !prefs.enabled || SOUND_CATEGORIES.every((category) => !prefs[category.id]);

  return {
    theme: themes.find((option) => option.id === theme)?.label ?? "",
    bullet: bullets.find((option) => option.id === bullet)?.label ?? "",
    animation: animations.find((option) => option.id === animation)?.label ?? "",
    sound: isMuted ? "Silenciados" : "Activados",
  };
};
