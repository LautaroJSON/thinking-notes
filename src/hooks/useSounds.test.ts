import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SOUND_STORAGE_KEY } from "@/components/utils/sounds";
import { playRecipe } from "@/components/utils/soundEngine";
import useSounds, { playSound, reloadSoundPreferences } from "./useSounds";

vi.mock("@/components/utils/soundEngine", () => ({
  playRecipe: vi.fn(),
  unlockAudio: vi.fn(),
}));

const playRecipeMock = vi.mocked(playRecipe);

const mockPointer = (coarse: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: coarse && query === "(pointer: coarse)",
    })),
  );
};

const dispatchStorage = (key: string | null) => {
  window.dispatchEvent(new StorageEvent("storage", { key }));
};

describe("useSounds", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPointer(false);
    reloadSoundPreferences();
    playRecipeMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("en computadora arranca todo encendido", () => {
    const { result } = renderHook(() => useSounds());
    expect(result.current.prefs).toEqual({
      enabled: true,
      typing: true,
      selection: true,
      actions: true,
    });
  });

  it("en táctil arranca con Escritura apagada", () => {
    mockPointer(true);
    reloadSoundPreferences();
    const { result } = renderHook(() => useSounds());
    expect(result.current.prefs.typing).toBe(false);
    expect(result.current.prefs.selection).toBe(true);
  });

  it("playSound reproduce cuando está permitido", () => {
    playSound("select");
    expect(playRecipeMock).toHaveBeenCalledWith("select");
  });

  it("apagar una categoría calla solo esa categoría", () => {
    const { result } = renderHook(() => useSounds());
    act(() => result.current.setCategory("typing", false));

    expect(result.current.prefs.typing).toBe(false);
    playSound("key");
    expect(playRecipeMock).not.toHaveBeenCalled();
    playSound("select");
    expect(playRecipeMock).toHaveBeenCalledWith("select");
  });

  it("el general apagado silencia todo y al encenderlo vuelven las categorías", () => {
    const { result } = renderHook(() => useSounds());
    act(() => result.current.setCategory("actions", false));
    act(() => result.current.setEnabled(false));
    playRecipeMock.mockClear();

    playSound("select");
    playSound("key");
    expect(playRecipeMock).not.toHaveBeenCalled();

    act(() => result.current.setEnabled(true));
    expect(result.current.prefs).toEqual({
      enabled: true,
      typing: true,
      selection: true,
      actions: false,
    });
  });

  it("encender una categoría reproduce una muestra", () => {
    const { result } = renderHook(() => useSounds());
    act(() => result.current.setCategory("typing", false));
    act(() => result.current.setCategory("typing", true));
    expect(playRecipeMock).toHaveBeenLastCalledWith("key");

    act(() => result.current.setCategory("actions", false));
    act(() => result.current.setCategory("actions", true));
    expect(playRecipeMock).toHaveBeenLastCalledWith("create");
  });

  it("con el general apagado, encender una categoría no suena", () => {
    const { result } = renderHook(() => useSounds());
    act(() => result.current.setEnabled(false));
    act(() => result.current.setCategory("selection", false));
    act(() => result.current.setCategory("selection", true));
    expect(playRecipeMock).not.toHaveBeenCalled();
  });

  it("todos los hooks ven el cambio", () => {
    const first = renderHook(() => useSounds());
    const second = renderHook(() => useSounds());
    act(() => first.result.current.setEnabled(false));
    expect(second.result.current.prefs.enabled).toBe(false);
  });

  it("guarda la preferencia en localStorage", () => {
    const { result } = renderHook(() => useSounds());
    act(() => result.current.setCategory("typing", false));
    expect(JSON.parse(localStorage.getItem(SOUND_STORAGE_KEY)!)).toEqual({
      typing: false,
    });

    act(() => result.current.setCategory("typing", true));
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBeNull();
  });

  it("adopta el cambio hecho en otra pestaña", () => {
    const { result } = renderHook(() => useSounds());
    localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify({ enabled: false }));
    act(() => dispatchStorage(SOUND_STORAGE_KEY));
    expect(result.current.prefs.enabled).toBe(false);
  });

  it("ignora cambios de otras claves", () => {
    const { result } = renderHook(() => useSounds());
    localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify({ enabled: false }));
    act(() => dispatchStorage("theme"));
    expect(result.current.prefs.enabled).toBe(true);
  });
});
