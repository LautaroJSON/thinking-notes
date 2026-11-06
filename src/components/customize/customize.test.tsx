import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reloadSoundPreferences } from "@/hooks/useSounds";
import { reloadNoteAnimation } from "@/hooks/useNoteAnimation";
import { reloadThinkingBullet } from "@/hooks/useThinkingBullet";
import { NOTE_ANIMATION_STORAGE_KEY } from "@/components/utils/noteAnimation";
import CustomizeMenu from ".";

vi.mock("@/components/utils/soundEngine", () => ({
  playRecipe: vi.fn(),
  unlockAudio: vi.fn(),
}));

const openMenu = () =>
  fireEvent.click(screen.getByRole("button", { name: "Personalizar" }));

const row = (name: RegExp) => screen.getByRole("button", { name });

describe("CustomizeMenu", () => {
  beforeEach(() => {
    localStorage.clear();
    reloadSoundPreferences();
    reloadNoteAnimation();
    reloadThinkingBullet();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("muestra una fila por sección con lo elegido", () => {
    render(<CustomizeMenu />);
    openMenu();

    expect(row(/Tema\s*Clásico/)).toBeTruthy();
    expect(row(/Decorado\s*Punto/)).toBeTruthy();
    expect(row(/Animación\s*Deslizar/)).toBeTruthy();
    expect(row(/Sonidos\s*Activados/)).toBeTruthy();
    expect(document.activeElement).toBe(row(/Tema\s*Clásico/));
  });

  it("entrar a una sección muestra sus opciones y la flecha vuelve", () => {
    render(<CustomizeMenu />);
    openMenu();

    fireEvent.click(row(/Decorado/));
    fireEvent.click(screen.getByRole("radio", { name: /Números/ }));

    expect(document.documentElement.dataset.bullet).toBe("number");
    expect(
      screen.getByRole("radio", { name: /Números/ }).getAttribute("aria-checked"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /Volver/ }));
    expect(row(/Decorado\s*Números/)).toBeTruthy();
    expect(document.activeElement).toBe(row(/Decorado\s*Números/));
  });

  it("Escape vuelve atrás y después cierra", () => {
    render(<CustomizeMenu />);
    openMenu();
    fireEvent.click(row(/Animación/));

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(row(/Animación\s*Deslizar/)).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Personalizar" }),
    );
  });

  it("tocar afuera cierra el menú", () => {
    render(<CustomizeMenu />);
    openMenu();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("apagar el general deja los sonidos silenciados", () => {
    render(<CustomizeMenu />);
    openMenu();
    fireEvent.click(row(/Sonidos/));

    fireEvent.click(screen.getByRole("switch", { name: "Sonidos" }));
    fireEvent.click(screen.getByRole("button", { name: /Volver/ }));

    expect(row(/Sonidos\s*Silenciados/)).toBeTruthy();
  });

  it("el ícono de la esquina abre la ventana con todas las secciones", () => {
    render(<CustomizeMenu />);
    openMenu();

    fireEvent.click(
      screen.getByRole("button", { name: "Abrir Personalizar en una ventana" }),
    );

    const modal = screen.getByRole("dialog", { name: "Personalizar" });
    expect(modal.tagName).toBe("DIALOG");
    for (const group of ["Tema", "Decorado de las ideas", "Animación de las notas"]) {
      expect(screen.getByRole("radiogroup", { name: group })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("radio", { name: /Hundirse/ }));
    expect(localStorage.getItem(NOTE_ANIMATION_STORAGE_KEY)).toBe("sink");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("radiogroup", { name: "Tema" })).toBeNull();
  });
});
