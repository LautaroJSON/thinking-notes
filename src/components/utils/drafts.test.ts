import { afterEach, describe, expect, it } from "vitest";
import {
  clearDraft,
  DRAFTS_STORAGE_KEY,
  loadDraft,
  saveDraft,
} from "./drafts";

describe("borradores por nota", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("devuelve vacío si la nota no tiene borrador", () => {
    expect(loadDraft("1")).toBe("");
  });

  it("guarda y recupera el borrador de cada nota por separado", () => {
    saveDraft("1", "idea a medias");
    saveDraft("2", "otra cosa");

    expect(loadDraft("1")).toBe("idea a medias");
    expect(loadDraft("2")).toBe("otra cosa");
  });

  it("guardar un texto vacío borra el borrador", () => {
    saveDraft("1", "algo");
    saveDraft("1", "");

    expect(loadDraft("1")).toBe("");
    expect(localStorage.getItem(DRAFTS_STORAGE_KEY)).toBeNull();
  });

  it("clearDraft borra solo el borrador de esa nota", () => {
    saveDraft("1", "uno");
    saveDraft("2", "dos");
    clearDraft("1");

    expect(loadDraft("1")).toBe("");
    expect(loadDraft("2")).toBe("dos");
  });

  it("ignora notas sin id", () => {
    saveDraft(undefined, "algo");

    expect(loadDraft(undefined)).toBe("");
    expect(localStorage.getItem(DRAFTS_STORAGE_KEY)).toBeNull();
  });

  it("devuelve vacío si lo guardado está corrupto", () => {
    localStorage.setItem(DRAFTS_STORAGE_KEY, "{no es json");

    expect(loadDraft("1")).toBe("");
  });
});
