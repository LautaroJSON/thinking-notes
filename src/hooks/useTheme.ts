import { useSyncExternalStore } from "react";
import {
  applyTheme,
  DEFAULT_THEME,
  getAppliedTheme,
  isThemeId,
  saveTheme,
  THEME_STORAGE_KEY,
  THEMES,
  type ThemeId,
} from "@/components/utils/theme";

// Tema activo compartido por todos los componentes. La fuente de verdad es el
// atributo data-theme de <html> (lo pone el script inline de index.html al
// cargar); este store solo avisa a React cuando cambia.
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

// Cambio hecho en otra pestaña: se aplica acá también
const handleStorage = (event: StorageEvent) => {
  if (event.key !== THEME_STORAGE_KEY) return;
  applyTheme(isThemeId(event.newValue) ? event.newValue : DEFAULT_THEME);
  notify();
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) window.addEventListener("storage", handleStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorage);
    }
  };
};

const setTheme = (id: ThemeId) => {
  applyTheme(id, { animate: true });
  saveTheme(id);
  notify();
};

const useTheme = () => {
  const theme = useSyncExternalStore(subscribe, getAppliedTheme);
  return { theme, themes: THEMES, setTheme };
};

export default useTheme;
