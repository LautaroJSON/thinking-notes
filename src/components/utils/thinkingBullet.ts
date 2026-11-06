// Decorado al principio de cada idea. La preferencia se guarda en este
// navegador (localStorage) y se aplica como data-bullet en <html>: los
// estilos de cada decorado están en noteContent/styles.css.

export const THINKING_BULLET_STORAGE_KEY = "thinkingBullet";

export const THINKING_BULLET_IDS = ["dot", "line", "number", "none"] as const;

export type ThinkingBulletId = (typeof THINKING_BULLET_IDS)[number];

export interface ThinkingBulletOption {
  id: ThinkingBulletId;
  label: string;
  description: string;
}

export const DEFAULT_THINKING_BULLET: ThinkingBulletId = "dot";

export const THINKING_BULLETS: readonly ThinkingBulletOption[] = [
  { id: "dot", label: "Punto", description: "Una viñeta junto a la primera línea" },
  {
    id: "line",
    label: "Línea",
    description: "Una línea vertical a lo alto de toda la idea",
  },
  { id: "number", label: "Números", description: "Cada idea numerada en orden" },
  { id: "none", label: "Nada", description: "Solo el texto" },
];

export const isThinkingBulletId = (value: unknown): value is ThinkingBulletId =>
  typeof value === "string" &&
  (THINKING_BULLET_IDS as readonly string[]).includes(value);

export const loadThinkingBullet = (): ThinkingBulletId => {
  try {
    const stored = localStorage.getItem(THINKING_BULLET_STORAGE_KEY);
    return isThinkingBulletId(stored) ? stored : DEFAULT_THINKING_BULLET;
  } catch {
    return DEFAULT_THINKING_BULLET;
  }
};

export const saveThinkingBullet = (id: ThinkingBulletId) => {
  try {
    if (id === DEFAULT_THINKING_BULLET) {
      localStorage.removeItem(THINKING_BULLET_STORAGE_KEY);
    } else {
      localStorage.setItem(THINKING_BULLET_STORAGE_KEY, id);
    }
  } catch (error) {
    // Se aplica igual; solo no se va a recordar al recargar
    console.error("Error guardando el decorado en localStorage:", error);
  }
};

export const applyThinkingBullet = (id: ThinkingBulletId) => {
  const root = document.documentElement;
  if (id === DEFAULT_THINKING_BULLET) {
    delete root.dataset.bullet;
  } else {
    root.dataset.bullet = id;
  }
};
