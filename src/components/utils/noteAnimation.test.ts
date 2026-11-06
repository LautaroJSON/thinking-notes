import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_NOTE_ANIMATION,
  loadNoteAnimation,
  NOTE_ANIMATION_STORAGE_KEY,
  saveNoteAnimation,
} from "./noteAnimation";

describe("preferencia de animación de las notas", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("usa «desde la tarjeta» si no hay nada guardado", () => {
    expect(loadNoteAnimation()).toBe(DEFAULT_NOTE_ANIMATION);
    expect(DEFAULT_NOTE_ANIMATION).toBe("card");
  });

  it("guarda y recupera la elección", () => {
    saveNoteAnimation("sink");
    expect(loadNoteAnimation()).toBe("sink");
  });

  it("ignora valores desconocidos", () => {
    localStorage.setItem(NOTE_ANIMATION_STORAGE_KEY, "girar");
    expect(loadNoteAnimation()).toBe(DEFAULT_NOTE_ANIMATION);
  });

  it("la de por defecto no ocupa lugar en localStorage", () => {
    saveNoteAnimation("slide");
    saveNoteAnimation("card");
    expect(localStorage.getItem(NOTE_ANIMATION_STORAGE_KEY)).toBeNull();
  });
});
