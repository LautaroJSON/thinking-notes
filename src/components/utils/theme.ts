// Temas visuales de la app. La preferencia se guarda en este navegador
// (localStorage), igual con y sin sesión; no se envía a la API.
//
// IMPORTANTE: el script inline de index.html aplica el tema guardado antes del
// primer pintado (para que no se vea un destello del Clásico). Si cambia la
// clave, los ids o los colores de la meta, hay que actualizarlo también; hay un
// test que verifica que coincidan.

export const THEME_STORAGE_KEY = "theme";

export const THEME_IDS = ["classic", "dark", "sunset"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeOption {
  id: ThemeId;
  // Nombre que se ve en el menú
  label: string;
  // Color de la barra del navegador / PWA (<meta name="theme-color">)
  metaColor: string;
}

export const DEFAULT_THEME: ThemeId = "classic";

export const THEMES: readonly ThemeOption[] = [
  { id: "classic", label: "Clásico", metaColor: "#ffffff" },
  { id: "dark", label: "Oscuro", metaColor: "#121214" },
  { id: "sunset", label: "Atardecer", metaColor: "#fff7ed" },
];

// Tiempo que dura la transición de colores al cambiar de tema
const THEME_TRANSITION_MS = 250;
let transitionTimeout: ReturnType<typeof setTimeout> | undefined;

export const isThemeId = (value: unknown): value is ThemeId =>
  typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);

export const loadTheme = (): ThemeId => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const saveTheme = (id: ThemeId) => {
  try {
    if (id === DEFAULT_THEME) {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    }
  } catch (error) {
    // El tema se aplica igual; solo no se va a recordar al recargar
    console.error("Error guardando el tema en localStorage:", error);
  }
};

export const applyTheme = (
  id: ThemeId,
  { animate = false }: { animate?: boolean } = {},
) => {
  const root = document.documentElement;

  if (animate) {
    root.classList.add("theme-transition");
    clearTimeout(transitionTimeout);
    transitionTimeout = setTimeout(() => {
      root.classList.remove("theme-transition");
    }, THEME_TRANSITION_MS);
  }

  if (id === DEFAULT_THEME) {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = id;
  }

  const option = THEMES.find((theme) => theme.id === id);
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (meta && option) meta.content = option.metaColor;
};

// El tema aplicado en <html> es la fuente de verdad mientras la app corre
export const getAppliedTheme = (): ThemeId => {
  const applied = document.documentElement.dataset.theme;
  return isThemeId(applied) ? applied : DEFAULT_THEME;
};
