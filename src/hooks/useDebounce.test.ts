import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { INotes } from "@/types";
import { useDebounce } from "./useDebounce";

const note = (title: string): INotes => ({ id: "1", title, thinkings: [] });

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve el valor inicial de inmediato", () => {
    const initial = note("inicial");
    const { result } = renderHook(() => useDebounce(initial, 500));

    expect(result.current).toBe(initial);
  });

  it("solo actualiza el valor cuando pasa el delay sin cambios", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: note("v1") } },
    );

    const v2 = note("v2");
    rerender({ value: v2 });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current?.title).toBe("v1");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(v2);
  });

  it("reinicia la espera si el valor cambia antes del delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: note("v1") } },
    );

    rerender({ value: note("v2") });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender({ value: note("v3") });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current?.title).toBe("v1");

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current?.title).toBe("v3");
  });
});
