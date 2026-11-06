import { afterEach, describe, expect, it } from "vitest";
import {
  applyThinkingBullet,
  DEFAULT_THINKING_BULLET,
  loadThinkingBullet,
  saveThinkingBullet,
  THINKING_BULLET_STORAGE_KEY,
} from "./thinkingBullet";

describe("decorado de las ideas", () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.bullet;
  });

  it("usa el punto si no hay nada guardado", () => {
    expect(loadThinkingBullet()).toBe("dot");
    expect(DEFAULT_THINKING_BULLET).toBe("dot");
  });

  it("guarda y recupera la elección", () => {
    saveThinkingBullet("line");
    expect(loadThinkingBullet()).toBe("line");
  });

  it("ignora valores desconocidos", () => {
    localStorage.setItem(THINKING_BULLET_STORAGE_KEY, "estrella");
    expect(loadThinkingBullet()).toBe("dot");
  });

  it("el punto no ocupa lugar en localStorage", () => {
    saveThinkingBullet("none");
    saveThinkingBullet("dot");
    expect(localStorage.getItem(THINKING_BULLET_STORAGE_KEY)).toBeNull();
  });

  it("se aplica como data-bullet en <html>, salvo el punto", () => {
    applyThinkingBullet("number");
    expect(document.documentElement.dataset.bullet).toBe("number");
    applyThinkingBullet("dot");
    expect(document.documentElement.dataset.bullet).toBeUndefined();
  });
});
