import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unlockAudio } from "@/components/utils/soundEngine";
import { playSound } from "./useSounds";
import useTypingSounds from "./useTypingSounds";

vi.mock("@/components/utils/soundEngine", () => ({
  playRecipe: vi.fn(),
  unlockAudio: vi.fn(),
}));
vi.mock("./useSounds", () => ({ playSound: vi.fn() }));

const playSoundMock = vi.mocked(playSound);

const type = (target: Element, inputType: string) => {
  target.dispatchEvent(
    new InputEvent("beforeinput", { inputType, bubbles: true }),
  );
};

const mount = <T extends HTMLElement>(element: T) => {
  document.body.appendChild(element);
  return element;
};

describe("useTypingSounds", () => {
  beforeEach(() => {
    playSoundMock.mockClear();
    vi.mocked(unlockAudio).mockClear();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
  });

  it("suena al escribir, borrar y dar Enter en un textarea", () => {
    renderHook(() => useTypingSounds());
    const textarea = mount(document.createElement("textarea"));

    type(textarea, "insertText");
    type(textarea, "deleteContentBackward");
    type(textarea, "insertLineBreak");

    expect(playSoundMock.mock.calls.map(([id]) => id)).toEqual([
      "key",
      "delete",
      "enter",
    ]);
  });

  it("pegar suena como acción de pegado", () => {
    renderHook(() => useTypingSounds());
    const input = mount(document.createElement("input"));
    type(input, "insertFromPaste");
    expect(playSoundMock).toHaveBeenCalledWith("paste");
  });

  it("funciona en inputs de texto y de búsqueda", () => {
    renderHook(() => useTypingSounds());
    const search = document.createElement("input");
    search.type = "search";
    mount(search);
    type(search, "insertText");
    expect(playSoundMock).toHaveBeenCalledWith("key");
  });

  it("no suena en campos de solo lectura, deshabilitados o que no son de texto", () => {
    renderHook(() => useTypingSounds());
    const readOnly = mount(document.createElement("textarea"));
    readOnly.readOnly = true;
    const disabled = mount(document.createElement("input"));
    disabled.disabled = true;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    mount(checkbox);

    type(readOnly, "insertText");
    type(disabled, "insertText");
    type(checkbox, "insertText");

    expect(playSoundMock).not.toHaveBeenCalled();
  });

  it("no suena con composición de IME", () => {
    renderHook(() => useTypingSounds());
    const textarea = mount(document.createElement("textarea"));
    type(textarea, "insertCompositionText");
    expect(playSoundMock).not.toHaveBeenCalled();
  });

  it("prepara el audio en cada gesto del usuario", () => {
    renderHook(() => useTypingSounds());
    document.dispatchEvent(new Event("pointerdown"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(unlockAudio).toHaveBeenCalledTimes(2);
  });

  it("al desmontar deja de escuchar", () => {
    const { unmount } = renderHook(() => useTypingSounds());
    unmount();
    const textarea = mount(document.createElement("textarea"));
    type(textarea, "insertText");
    expect(playSoundMock).not.toHaveBeenCalled();
  });
});
