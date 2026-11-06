import { useSyncExternalStore } from "react";
import {
  isSoundAllowed,
  loadSoundPreferences,
  saveSoundPreferences,
  SOUND_STORAGE_KEY,
  type SoundCategoryId,
  type SoundId,
  type SoundPreferences,
} from "@/components/utils/sounds";
import { playRecipe } from "@/components/utils/soundEngine";

// Preferencia de sonido compartida por toda la app. Vive en memoria y se
// guarda en localStorage; este store avisa a React cuando cambia.

// El puntero principal grueso indica celular/tablet. Una laptop con pantalla
// táctil reporta "fine" y se trata como computadora.
const isTouchDevice = () => {
  try {
    return window.matchMedia?.("(pointer: coarse)").matches ?? false;
  } catch {
    return false;
  }
};

let prefs: SoundPreferences = loadSoundPreferences(isTouchDevice());

const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

// Vuelve a leer la preferencia guardada (otra pestaña la cambió)
export const reloadSoundPreferences = () => {
  prefs = loadSoundPreferences(isTouchDevice());
  notify();
};

const handleStorage = (event: StorageEvent) => {
  // key === null: se borró todo el localStorage
  if (event.key !== SOUND_STORAGE_KEY && event.key !== null) return;
  reloadSoundPreferences();
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

const getSnapshot = () => prefs;

const update = (next: SoundPreferences) => {
  prefs = next;
  saveSoundPreferences(next, isTouchDevice());
  notify();
};

// Reproduce un sonido si las preferencias lo permiten. Se puede usar fuera de
// componentes (contexto de notas, listeners globales).
export const playSound = (id: SoundId) => {
  if (isSoundAllowed(id, prefs)) playRecipe(id);
};

// Muestra que suena al encender cada categoría
const CATEGORY_SAMPLE: Record<SoundCategoryId, SoundId> = {
  typing: "key",
  selection: "select",
  actions: "create",
};

const setEnabled = (value: boolean) => {
  update({ ...prefs, enabled: value });
};

const setCategory = (id: SoundCategoryId, value: boolean) => {
  update({ ...prefs, [id]: value });
  if (value) playSound(CATEGORY_SAMPLE[id]);
};

const useSounds = () => {
  const current = useSyncExternalStore(subscribe, getSnapshot);
  return { prefs: current, setEnabled, setCategory, play: playSound };
};

export default useSounds;
