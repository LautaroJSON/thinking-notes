import { describe, expect, it } from "vitest";
import { formatNoteDate } from "./dates";

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
