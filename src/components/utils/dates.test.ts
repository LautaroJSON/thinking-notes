import { describe, expect, it } from "vitest";
import { formatNoteDate, formatRelativeNoteDate } from "./dates";

describe("formatNoteDate", () => {
  it("formatea fecha y hora en español", () => {
    const text = formatNoteDate("2026-11-05T17:32:00.000Z", "UTC");
    expect(text).toContain("5 de noviembre de 2026");
    expect(text).toContain("17:32");
  });

  it("usa la zona horaria indicada", () => {
    expect(
      formatNoteDate("2026-11-05T02:00:00.000Z", "America/Argentina/Buenos_Aires"),
    ).toContain("4 de noviembre de 2026");
  });

  it("devuelve null sin fecha", () => {
    expect(formatNoteDate(undefined)).toBeNull();
    expect(formatNoteDate("")).toBeNull();
  });

  it("devuelve null con una fecha inválida", () => {
    expect(formatNoteDate("no-es-fecha")).toBeNull();
  });
});

describe("formatRelativeNoteDate", () => {
  const NOW = Date.parse("2026-11-09T15:00:00.000Z");
  const ago = (ms: number) => new Date(NOW - ms).toISOString();
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it("menos de un minuto es «recién», también si la fecha está apenas en el futuro", () => {
    expect(formatRelativeNoteDate(ago(20_000), NOW)).toBe("recién");
    expect(formatRelativeNoteDate(ago(-5_000), NOW)).toBe("recién");
  });

  it("usa minutos, horas y días", () => {
    expect(formatRelativeNoteDate(ago(5 * MIN), NOW)).toBe("hace 5 minutos");
    expect(formatRelativeNoteDate(ago(2 * HOUR + 40 * MIN), NOW)).toBe("hace 2 horas");
    expect(formatRelativeNoteDate(ago(DAY + HOUR), NOW)).toBe("ayer");
    expect(formatRelativeNoteDate(ago(3 * DAY), NOW)).toBe("hace 3 días");
  });

  it("desde una semana muestra la fecha corta, con año solo si no es el actual", () => {
    expect(formatRelativeNoteDate("2026-10-05T12:00:00.000Z", NOW, "UTC")).toMatch(
      /^el 5 oct\.?$/,
    );
    expect(formatRelativeNoteDate("2025-10-05T12:00:00.000Z", NOW, "UTC")).toMatch(
      /^el 5 oct\.? 2025$/,
    );
  });

  it("devuelve null sin fecha o con una fecha inválida", () => {
    expect(formatRelativeNoteDate(undefined, NOW)).toBeNull();
    expect(formatRelativeNoteDate("no-es-fecha", NOW)).toBeNull();
  });
});
