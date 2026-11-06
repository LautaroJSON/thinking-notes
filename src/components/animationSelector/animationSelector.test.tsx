import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reloadNoteAnimation } from "@/hooks/useNoteAnimation";
import { NOTE_ANIMATION_STORAGE_KEY } from "@/components/utils/noteAnimation";
import AnimationSelector from ".";

vi.mock("@/components/utils/soundEngine", () => ({
  playRecipe: vi.fn(),
  unlockAudio: vi.fn(),
}));

const openMenu = () => {
  fireEvent.click(
    screen.getByRole("button", { name: "Animación de las notas" }),
  );
};

const option = (name: string) => screen.getByRole("menuitemradio", { name });

describe("AnimationSelector", () => {
  beforeEach(() => {
    localStorage.clear();
    reloadNoteAnimation();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("muestra las tres animaciones con la de la tarjeta elegida por defecto", () => {
    render(<AnimationSelector />);
    openMenu();

    expect(option("Desde la tarjeta").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(option("Hundirse").getAttribute("aria-checked")).toBe("false");
    expect(option("Deslizar").getAttribute("aria-checked")).toBe("false");
    expect(document.activeElement).toBe(option("Desde la tarjeta"));
  });

  it("elegir una animación la guarda y cierra el menú", () => {
    render(<AnimationSelector />);
    openMenu();

    fireEvent.click(option("Deslizar"));

    expect(screen.queryByRole("menu")).toBeNull();
    expect(localStorage.getItem(NOTE_ANIMATION_STORAGE_KEY)).toBe("slide");

    openMenu();
    expect(option("Deslizar").getAttribute("aria-checked")).toBe("true");
  });

  it("recuerda la animación guardada", () => {
    localStorage.setItem(NOTE_ANIMATION_STORAGE_KEY, "sink");
    reloadNoteAnimation();
    render(<AnimationSelector />);
    openMenu();

    expect(option("Hundirse").getAttribute("aria-checked")).toBe("true");
  });

  it("Escape cierra el menú y devuelve el foco al botón", () => {
    render(<AnimationSelector />);
    openMenu();

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Animación de las notas" }),
    );
  });
});
