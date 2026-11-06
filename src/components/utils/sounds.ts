// Sonidos de interacción: categorías, valores por defecto y reglas de cuándo
// suena cada cosa. La preferencia se guarda en este navegador (localStorage),
// igual con y sin sesión; no se envía a la API.

export type SoundCategoryId = "typing" | "selection" | "actions";

export type SoundId =
  | "key"
  | "delete"
  | "enter"
  | "select"
  | "close"
  | "noteOpen"
  | "noteClose"
  | "panelOpen"
  | "panelClose"
  | "create"
  | "send"
  | "remove"
  | "copy"
  | "drop"
  | "paste"
  | "dictationStart"
  | "dictationStop";

export interface SoundPreferences {
  // Interruptor general: apagado silencia todo sin perder las categorías
  enabled: boolean;
  typing: boolean;
  selection: boolean;
  actions: boolean;
}

export const SOUND_CATEGORIES: readonly {
  id: SoundCategoryId;
  label: string;
}[] = [
  { id: "typing", label: "Escritura" },
  { id: "selection", label: "Selección" },
  { id: "actions", label: "Acciones" },
];

export const SOUND_CATEGORY: Record<SoundId, SoundCategoryId> = {
  key: "typing",
  delete: "typing",
  enter: "typing",
  select: "selection",
  close: "selection",
  noteOpen: "selection",
  noteClose: "selection",
  panelOpen: "selection",
  panelClose: "selection",
  create: "actions",
  send: "actions",
  remove: "actions",
  copy: "actions",
  drop: "actions",
  paste: "actions",
  dictationStart: "actions",
  dictationStop: "actions",
};

// En dispositivos táctiles el teclado del sistema ya hace su propio clic, así
// que Escritura arranca apagada para no duplicar la respuesta.
export const getDefaultSoundPreferences = (
  isTouch: boolean,
): SoundPreferences => ({
  enabled: true,
  typing: !isTouch,
  selection: true,
  actions: true,
});

export const isSoundAllowed = (id: SoundId, prefs: SoundPreferences) =>
  prefs.enabled && prefs[SOUND_CATEGORY[id]];

// Traduce el inputType de un evento beforeinput al sonido que corresponde.
// Lo que no es tipeo real (IME a medio componer, deshacer, formato) no suena.
export const soundForInputType = (inputType: string): SoundId | null => {
  if (inputType === "insertText" || inputType === "insertReplacementText") {
    return "key";
  }
  if (inputType === "insertLineBreak" || inputType === "insertParagraph") {
    return "enter";
  }
  if (inputType === "insertFromPaste" || inputType === "insertFromDrop") {
    return "paste";
  }
  if (inputType.startsWith("deleteContent") || inputType.startsWith("deleteWord")) {
    return "delete";
  }
  return null;
};

// ---- Preferencia guardada ----
// Se guardan solo los valores que difieren del default del dispositivo, así
// Escritura sigue el default (táctil/computadora) hasta que el usuario la toca.

export const SOUND_STORAGE_KEY = "sounds";

const PREFERENCE_KEYS = ["enabled", "typing", "selection", "actions"] as const;

export const loadSoundPreferences = (isTouch: boolean): SoundPreferences => {
  const prefs = getDefaultSoundPreferences(isTouch);
  try {
    const raw = localStorage.getItem(SOUND_STORAGE_KEY);
    if (raw === null) return prefs;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return prefs;
    }
    const stored = parsed as Record<string, unknown>;
    for (const key of PREFERENCE_KEYS) {
      const value = stored[key];
      if (typeof value === "boolean") prefs[key] = value;
    }
  } catch {
    // Valor corrupto o localStorage bloqueado: se usan los defaults
  }
  return prefs;
};

export const saveSoundPreferences = (
  prefs: SoundPreferences,
  isTouch: boolean,
) => {
  const defaults = getDefaultSoundPreferences(isTouch);
  const overrides: Partial<SoundPreferences> = {};
  for (const key of PREFERENCE_KEYS) {
    if (prefs[key] !== defaults[key]) overrides[key] = prefs[key];
  }

  try {
    if (Object.keys(overrides).length === 0) {
      localStorage.removeItem(SOUND_STORAGE_KEY);
    } else {
      localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch (error) {
    // La preferencia se aplica igual; solo no se va a recordar al recargar
    console.error("Error guardando la preferencia de sonido:", error);
  }
};
