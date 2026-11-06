import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeAnimation,
  launchKeyframes,
  openAnimation,
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

describe("animaciones de apertura y cierre", () => {
  it("cerrar hacia la tarjeta es la apertura al revés", () => {
    const open = openAnimation("card", { card, panel, radius: 16 })!;
    const close = closeAnimation("card", { card, panel, radius: 16 })!;

    expect(close.keyframes[0]).toEqual(open.keyframes.at(-1));
    expect(close.keyframes.at(-1)).toEqual(open.keyframes[0]);
    expect(close.transformOrigin).toBe("0 0");
  });

  it("sin tarjeta visible, «desde la tarjeta» se hunde", () => {
    const close = closeAnimation("card", { card: null, panel })!;
    expect(close).toEqual(closeAnimation("sink", { panel }));
  });

  it("deslizar baja al cerrar y sube al abrir", () => {
    const close = closeAnimation("slide", { panel })!;
    const open = openAnimation("slide", { card, panel })!;

    expect(close.keyframes.at(-1)).toMatchObject({ opacity: 0 });
    expect(open.keyframes[0]).toEqual(close.keyframes.at(-1));
    expect(open.keyframes.at(-1)).toEqual(close.keyframes[0]);
  });
});
