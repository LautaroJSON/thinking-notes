import type { INotes } from "@/types";
import { useEffect, useState } from "react";

export function useDebounce(value: INotes | null, delay: number = 5000) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
