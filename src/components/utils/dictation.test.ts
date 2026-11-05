import { describe, expect, it } from "vitest";
import { appendTranscript, composeDraft, stripInterim } from "./dictation";

describe("appendTranscript", () => {
  it("U1: con base vacía devuelve el fragmento", () => {
    expect(appendTranscript("", "hola")).toBe("hola");
  });

  it("U2: separa con un espacio", () => {
    expect(appendTranscript("idea", "nueva")).toBe("idea nueva");
  });

  it("U3: no deja espacios dobles", () => {
    expect(appendTranscript("idea ", " nueva ")).toBe("idea nueva");
  });

  it("U4: no agrega espacio después de un salto de línea", () => {
    expect(appendTranscript("línea\n", "otra")).toBe("línea\notra");
  });

  it("U5: un fragmento vacío no modifica la base", () => {
    expect(appendTranscript("idea", "   ")).toBe("idea");
  });
});

describe("composeDraft", () => {
  it("U6: sin provisorio devuelve el borrador", () => {
    expect(composeDraft("idea", "")).toBe("idea");
  });

  it("U7: agrega el provisorio con la misma regla", () => {
    expect(composeDraft("idea", "en curso")).toBe("idea en curso");
  });
});

describe("stripInterim", () => {
  it("U8: si el usuario editó el sufijo no se toca", () => {
    expect(stripInterim("idea en cursox", "en curso")).toBe("idea en cursox");
  });

  it("U9: quita el provisorio y su separador", () => {
    expect(stripInterim("idea en curso", "en curso")).toBe("idea");
  });

  it("U10: sin provisorio devuelve el valor", () => {
    expect(stripInterim("lo que sea ", "")).toBe("lo que sea ");
  });

  it("quita el provisorio cuando el borrador estaba vacío", () => {
    expect(stripInterim("en curso", "en curso")).toBe("");
  });
});
