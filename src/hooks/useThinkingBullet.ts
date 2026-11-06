import { useSyncExternalStore } from "react";
import {
  applyThinkingBullet,
  loadThinkingBullet,
  saveThinkingBullet,
  THINKING_BULLET_STORAGE_KEY,
  THINKING_BULLETS,
  type ThinkingBulletId,
} from "@/components/utils/thinkingBullet";

// Preferencia compartida por todos los componentes (y por otras pestañas).
// main.tsx la aplica al arrancar.
let current = loadThinkingBullet();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

const handleStorage = (event: StorageEvent) => {
  if (event.key !== THINKING_BULLET_STORAGE_KEY) return;
  current = loadThinkingBullet();
  applyThinkingBullet(current);
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

const getThinkingBullet = () => current;

const setThinkingBullet = (id: ThinkingBulletId) => {
  current = id;
  applyThinkingBullet(id);
  saveThinkingBullet(id);
  notify();
};

// Para los tests: vuelve a leer la preferencia guardada
export const reloadThinkingBullet = () => {
  current = loadThinkingBullet();
  applyThinkingBullet(current);
  notify();
};

const useThinkingBullet = () => {
  const bullet = useSyncExternalStore(subscribe, getThinkingBullet);
  return { bullet, bullets: THINKING_BULLETS, setThinkingBullet };
};

export default useThinkingBullet;
