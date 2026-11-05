import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  getAppliedTheme,
  isThemeId,
  loadTheme,
  saveTheme,
  THEME_STORAGE_KEY,
  THEMES,
} from "./theme";
import indexHtml from "../../../index.html?raw";

const getMeta = () =>
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

describe("temas", () => {
  beforeEach(() => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#ffffff";
    document.head.appendChild(meta);
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    document.documentElement.classList.remove("theme-transition");
    getMeta()?.remove();
  });

  describe("isThemeId", () => {
    it("acepta los tres temas", () => {
      expect(isThemeId("classic")).toBe(true);
      expect(isThemeId("dark")).toBe(true);
      expect(isThemeId("sunset")).toBe(true);
    });

    it("rechaza cualquier otro valor", () => {
      expect(isThemeId("rosa")).toBe(false);
      expect(isThemeId("")).toBe(false);
      expect(isThemeId(null)).toBe(false);
      expect(isThemeId(42)).toBe(false);
    });
  });

  describe("loadTheme", () => {
    it("devuelve classic si no hay tema guardado", () => {
      expect(loadTheme()).toBe("classic");
    });

    it("devuelve el tema guardado", () => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      expect(loadTheme()).toBe("dark");
    });

    it("devuelve classic si el valor guardado no es válido", () => {
      localStorage.setItem(THEME_STORAGE_KEY, "rosa");
      expect(loadTheme()).toBe("classic");
    });

    it("devuelve classic si el almacenamiento falla", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("bloqueado");
      });
      expect(loadTheme()).toBe("classic");
    });
  });

  describe("saveTheme", () => {
    it("guarda el tema elegido", () => {
      saveTheme("sunset");
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("sunset");
    });

    it("elegir classic borra la clave", () => {
      saveTheme("dark");
      saveTheme("classic");
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    });

    it("no lanza si el almacenamiento falla", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("lleno");
      });
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => saveTheme("dark")).not.toThrow();
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe("applyTheme / getAppliedTheme", () => {
    it("aplica el tema en <html> y en la meta theme-color", () => {
      applyTheme("dark");

      const dark = THEMES.find((t) => t.id === "dark")!;
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(getMeta()?.content).toBe(dark.metaColor);
      expect(getAppliedTheme()).toBe("dark");
    });

    it("classic quita el atributo", () => {
      applyTheme("sunset");
      applyTheme("classic");

      expect(document.documentElement.dataset.theme).toBeUndefined();
      expect(getMeta()?.content).toBe("#ffffff");
      expect(getAppliedTheme()).toBe("classic");
    });

    it("getAppliedTheme ignora un atributo inválido", () => {
      document.documentElement.dataset.theme = "rosa";
      expect(getAppliedTheme()).toBe("classic");
    });

    it("con animate pone la clase de transición y la quita después", () => {
      vi.useFakeTimers();
      try {
        applyTheme("dark", { animate: true });
        expect(
          document.documentElement.classList.contains("theme-transition"),
        ).toBe(true);

        vi.advanceTimersByTime(300);
        expect(
          document.documentElement.classList.contains("theme-transition"),
        ).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it("sin animate no pone la clase de transición", () => {
      applyTheme("dark");
      expect(
        document.documentElement.classList.contains("theme-transition"),
      ).toBe(false);
    });
  });

  describe("script inline de index.html", () => {
    it("usa la misma clave, ids y colores que theme.ts", () => {
      const script = indexHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];

      expect(script).toBeDefined();
      expect(script).toContain(`"${THEME_STORAGE_KEY}"`);
      for (const theme of THEMES.filter((t) => t.id !== "classic")) {
        expect(script).toContain(`${theme.id}: "${theme.metaColor}"`);
      }
      expect(indexHtml).toContain('<meta name="theme-color" content="#ffffff"');
    });

    it("aplica el tema guardado y deja classic ante valores inválidos", () => {
      const script = indexHtml.match(/<script>([\s\S]*?)<\/script>/)![1];
      const run = new Function(script);

      localStorage.setItem(THEME_STORAGE_KEY, "sunset");
      run();
      expect(document.documentElement.dataset.theme).toBe("sunset");
      expect(getMeta()?.content).toBe("#fff7ed");

      delete document.documentElement.dataset.theme;
      localStorage.setItem(THEME_STORAGE_KEY, "rosa");
      run();
      expect(document.documentElement.dataset.theme).toBeUndefined();

      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("bloqueado");
      });
      expect(() => run()).not.toThrow();
    });
  });
});
