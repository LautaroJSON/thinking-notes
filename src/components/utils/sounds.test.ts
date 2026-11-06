import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultSoundPreferences,
  isSoundAllowed,
  loadSoundPreferences,
  saveSoundPreferences,
  SOUND_CATEGORIES,
  SOUND_CATEGORY,
  SOUND_STORAGE_KEY,
  soundForInputType,
  type SoundId,
  type SoundPreferences,
} from "./sounds";

const ALL_ON: SoundPreferences = {
  enabled: true,
  typing: true,
  selection: true,
  actions: true,
};

describe("getDefaultSoundPreferences", () => {
  it("en computadora arranca todo encendido", () => {
    expect(getDefaultSoundPreferences(false)).toEqual(ALL_ON);
  });

  it("en táctil arranca con Escritura apagada", () => {
    expect(getDefaultSoundPreferences(true)).toEqual({
      ...ALL_ON,
      typing: false,
    });
  });
});

describe("SOUND_CATEGORIES", () => {
  it("lista las categorías en el orden del menú", () => {
    expect(SOUND_CATEGORIES.map((c) => c.label)).toEqual([
      "Escritura",
      "Selección",
      "Acciones",
    ]);
  });

  it("cada sonido pertenece a una categoría existente", () => {
    const ids = SOUND_CATEGORIES.map((c) => c.id);
    for (const category of Object.values(SOUND_CATEGORY)) {
      expect(ids).toContain(category);
    }
  });
});

describe("isSoundAllowed", () => {
  it("permite el sonido con el general y su categoría encendidos", () => {
    expect(isSoundAllowed("key", ALL_ON)).toBe(true);
    expect(isSoundAllowed("select", ALL_ON)).toBe(true);
    expect(isSoundAllowed("create", ALL_ON)).toBe(true);
  });

  it("con el general apagado no suena nada", () => {
    const prefs = { ...ALL_ON, enabled: false };
    const ids = Object.keys(SOUND_CATEGORY) as SoundId[];
    expect(ids.some((id) => isSoundAllowed(id, prefs))).toBe(false);
  });

  it("con una categoría apagada solo calla esa categoría", () => {
    const prefs = { ...ALL_ON, typing: false };
    expect(isSoundAllowed("key", prefs)).toBe(false);
    expect(isSoundAllowed("delete", prefs)).toBe(false);
    expect(isSoundAllowed("select", prefs)).toBe(true);
    expect(isSoundAllowed("paste", prefs)).toBe(true);
  });
});

describe("soundForInputType", () => {
  it.each([
    ["insertText", "key"],
    ["insertReplacementText", "key"],
    ["deleteContentBackward", "delete"],
    ["deleteContentForward", "delete"],
    ["deleteWordBackward", "delete"],
    ["deleteWordForward", "delete"],
    ["insertLineBreak", "enter"],
    ["insertParagraph", "enter"],
    ["insertFromPaste", "paste"],
    ["insertFromDrop", "paste"],
  ])("%s → %s", (inputType, expected) => {
    expect(soundForInputType(inputType)).toBe(expected);
  });

  it.each(["insertCompositionText", "historyUndo", "formatBold", ""])(
    "%s no suena",
    (inputType) => {
      expect(soundForInputType(inputType)).toBeNull();
    },
  );
});

describe("loadSoundPreferences", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("sin nada guardado usa los defaults del dispositivo", () => {
    expect(loadSoundPreferences(false)).toEqual(ALL_ON);
    expect(loadSoundPreferences(true)).toEqual({ ...ALL_ON, typing: false });
  });

  it("aplica lo guardado sobre los defaults", () => {
    localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify({ typing: true }));
    expect(loadSoundPreferences(true).typing).toBe(true);

    localStorage.setItem(
      SOUND_STORAGE_KEY,
      JSON.stringify({ enabled: false, actions: false }),
    );
    expect(loadSoundPreferences(false)).toEqual({
      ...ALL_ON,
      enabled: false,
      actions: false,
    });
  });

  it.each(["no-es-json", "null", "[true]", "42", '"texto"'])(
    "con un valor inválido (%s) usa los defaults",
    (raw) => {
      localStorage.setItem(SOUND_STORAGE_KEY, raw);
      expect(loadSoundPreferences(false)).toEqual(ALL_ON);
    },
  );

  it("ignora campos con tipos incorrectos y claves desconocidas", () => {
    localStorage.setItem(
      SOUND_STORAGE_KEY,
      JSON.stringify({ typing: "no", selection: false, volume: 3 }),
    );
    expect(loadSoundPreferences(false)).toEqual({ ...ALL_ON, selection: false });
  });

  it("si localStorage lanza, usa los defaults", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(loadSoundPreferences(false)).toEqual(ALL_ON);
  });
});

describe("saveSoundPreferences", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("guarda solo lo que difiere del default", () => {
    saveSoundPreferences({ ...ALL_ON, typing: false }, false);
    expect(JSON.parse(localStorage.getItem(SOUND_STORAGE_KEY)!)).toEqual({
      typing: false,
    });
  });

  it("en táctil, Escritura apagada es el default y no se guarda", () => {
    saveSoundPreferences({ ...ALL_ON, typing: false }, true);
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBeNull();
  });

  it("borra la clave si todo vuelve al default", () => {
    localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify({ enabled: false }));
    saveSoundPreferences(ALL_ON, false);
    expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBeNull();
  });

  it("si localStorage falla no lanza", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("lleno");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      saveSoundPreferences({ ...ALL_ON, enabled: false }, false),
    ).not.toThrow();
  });
});
