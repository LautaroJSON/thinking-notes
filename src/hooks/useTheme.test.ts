import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY } from "@/components/utils/theme";
import useTheme from "./useTheme";

const dispatchStorage = (key: string | null, newValue: string | null) => {
  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
};

describe("useTheme", () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.classList.remove("theme-transition");
  });

  it("arranca en classic si no hay tema aplicado", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("classic");
  });

  it("toma el tema que ya está aplicado en <html> (script inline)", () => {
    document.documentElement.dataset.theme = "sunset";
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("sunset");
  });

  it("expone el catálogo en orden Clásico, Oscuro, Atardecer", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.themes.map((t) => t.label)).toEqual([
      "Clásico",
      "Oscuro",
      "Atardecer",
    ]);
  });

  it("setTheme aplica el tema y todos los hooks lo ven", () => {
    const first = renderHook(() => useTheme());
    const second = renderHook(() => useTheme());

    act(() => first.result.current.setTheme("dark"));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(first.result.current.theme).toBe("dark");
    expect(second.result.current.theme).toBe("dark");
  });

  it("setTheme guarda la preferencia y classic la borra", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("sunset"));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("sunset");

    act(() => result.current.setTheme("classic"));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("adopta el tema elegido en otra pestaña", () => {
    const { result } = renderHook(() => useTheme());

    act(() => dispatchStorage(THEME_STORAGE_KEY, "dark"));

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("un valor inválido o borrado desde otra pestaña vuelve a classic", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("dark"));

    act(() => dispatchStorage(THEME_STORAGE_KEY, "rosa"));
    expect(result.current.theme).toBe("classic");

    act(() => result.current.setTheme("dark"));
    act(() => dispatchStorage(THEME_STORAGE_KEY, null));
    expect(result.current.theme).toBe("classic");
  });

  it("ignora cambios de otras claves", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("sunset"));

    act(() => dispatchStorage("notes", "[]"));

    expect(result.current.theme).toBe("sunset");
  });
});
