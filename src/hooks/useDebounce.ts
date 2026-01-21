import { useEffect, useRef } from "react";

/**
 * Hook que ejecuta una función después de que haya pasado un tiempo
 * sin ser llamada nuevamente (debounce)
 * @param callback - Función a ejecutar
 * @param delay - Tiempo en milisegundos antes de ejecutar
 */
export const useDebounce = (callback: () => void, delay: number = 5000) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Limpiar el timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Crear un nuevo timeout
    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [callback, delay]);
};
