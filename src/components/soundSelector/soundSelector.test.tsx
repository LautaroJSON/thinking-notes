import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playRecipe } from "@/components/utils/soundEngine";
import { reloadSoundPreferences } from "@/hooks/useSounds";
import SoundSelector from ".";

vi.mock("@/components/utils/soundEngine", () => ({
  playRecipe: vi.fn(),
  unlockAudio: vi.fn(),
}));

const openMenu = () => {
  fireEvent.click(screen.getByRole("button", { name: "Sonidos" }));
};

const item = (name: string) =>
  screen.getByRole("menuitemcheckbox", { name });

describe("SoundSelector", () => {
  beforeEach(() => {
    localStorage.clear();
    reloadSoundPreferences();
    vi.mocked(playRecipe).mockClear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("muestra el interruptor general y uno por categoría, todos encendidos", () => {
    render(<SoundSelector />);
    openMenu();

    for (const name of ["Sonidos", "Escritura", "Selección", "Acciones"]) {
      expect(item(name).getAttribute("aria-checked")).toBe("true");
    }
    expect(document.activeElement).toBe(item("Sonidos"));
  });

  it("apagar una categoría no cierra el menú", () => {
    render(<SoundSelector />);
    openMenu();

    fireEvent.click(item("Escritura"));

    expect(item("Escritura").getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("menu")).not.toBeNull();
  });

  it("apagar el general muestra el parlante silenciado", () => {
    render(<SoundSelector />);
    openMenu();

    fireEvent.click(item("Sonidos"));

    expect(item("Sonidos").getAttribute("aria-checked")).toBe("false");
    expect(
      screen.queryByRole("button", { name: "Sonidos (silenciados)" }),
    ).not.toBeNull();
  });

  it("Escape cierra el menú y devuelve el foco al botón", () => {
    render(<SoundSelector />);
    openMenu();

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sonidos" }));
  });

  it("tocar afuera cierra el menú", () => {
    render(<SoundSelector />);
    openMenu();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("las flechas recorren los interruptores", () => {
    render(<SoundSelector />);
    openMenu();

    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
    expect(document.activeElement).toBe(item("Escritura"));
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" });
    fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowUp" });
    expect(document.activeElement).toBe(item("Acciones"));
  });
});
