/**
 * Hook que ejecuta una función después de que haya pasado un tiempo
 * sin ser llamada nuevamente (debounce)
 * @param callback - Función a ejecutar
 * @param delay - Tiempo en milisegundos antes de ejecutar
 */
export declare const useDebounce: (callback: () => void, delay?: number) => void;
