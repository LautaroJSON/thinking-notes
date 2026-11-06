import { afterEach, describe, expect, it, vi } from "vitest";
import {
  launchKeyframes,
  setLaunchOrigin,
  takeLaunchOrigin,
} from "./noteLaunch";

const card = { left: 0, top: 200, width: 230, height: 80 };
const panel = { left: 400, top: 14, width: 920, height: 800 };

describe("origen de la animación de apertura", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve el origen de la nota clickeada una sola vez", () => {
    setLaunchOrigin("n1", card);
    expect(takeLaunchOrigin("n1")).toEqual(card);
    expect(takeLaunchOrigin("n1")).toBeNull();
  });

  it("ignora el origen si se abre otra nota", () => {
    setLaunchOrigin("n1", card);
    expect(takeLaunchOrigin("n2")).toBeNull();
  });

  it("descarta un origen viejo", () => {
    vi.useFakeTimers();
    setLaunchOrigin("n1", card);
    vi.advanceTimersByTime(2000);
    expect(takeLaunchOrigin("n1")).toBeNull();
  });
});

describe("fotogramas de la animación", () => {
  it("arranca con lo visible del panel justo sobre la tarjeta", () => {
    const [first] = launchKeyframes(card, panel)!;
    const scale = card.width / panel.width;
    const insetY = (panel.height - card.height / scale) / 2;

    expect(first.transform).toBe(
      `translate(${card.left - panel.left}px, ${card.top - panel.top - insetY * scale}px) scale(${scale})`,
    );
    expect(first.clipPath).toBe(
      `inset(${insetY}px 0px round ${12 / scale}px)`,
    );
    expect(first.opacity).toBe(0);
  });

  it("termina con el panel en su lugar", () => {
    const frames = launchKeyframes(card, panel, { toRadius: 16 })!;
    expect(frames.at(-1)).toEqual({
      transform: "translate(0px, 0px) scale(1)",
      clipPath: "inset(0px 0px round 16px)",
      opacity: 1,
    });
  });

  it("no anima si algún rectángulo no tiene tamaño", () => {
    expect(launchKeyframes(card, { ...panel, width: 0 })).toBeNull();
  });
});
