import { useSyncExternalStore } from "react";
import {
  loadNoteAnimation,
  NOTE_ANIMATION_STORAGE_KEY,
  NOTE_ANIMATIONS,
  saveNoteAnimation,
  type NoteAnimationId,
} from "@/components/utils/noteAnimation";

// Preferencia compartida por todos los componentes (y por otras pestañas)
let current = loadNoteAnimation();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const handleStorage = (event: StorageEvent) => {
  if (event.key !== NOTE_ANIMATION_STORAGE_KEY) return;
  current = loadNoteAnimation();
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

export const getNoteAnimation = () => current;

const setNoteAnimation = (id: NoteAnimationId) => {
  current = id;
  saveNoteAnimation(id);
  notify();
};

// Para los tests: vuelve a leer la preferencia guardada
export const reloadNoteAnimation = () => {
  current = loadNoteAnimation();
  notify();
};

const useNoteAnimation = () => {
  const animation = useSyncExternalStore(subscribe, getNoteAnimation);
  return { animation, animations: NOTE_ANIMATIONS, setNoteAnimation };
};

export default useNoteAnimation;
