import { describe, expect, it, vi } from "vitest";
import {
  getImageRefs,
  getThinkingText,
  isLocalRef,
  parseThinkings,
  type Thinking,
} from "./thinking";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("parseThinkings", () => {
  it("convierte cada string en un pensamiento de texto con id nuevo", () => {
    const { thinkings, migrated } = parseThinkings(["uno", "dos"]);

    expect(migrated).toBe(true);
    expect(thinkings).toHaveLength(2);
    expect(thinkings[0]).toEqual({
      id: expect.stringMatching(UUID_RE),
      type: "text",
      value: "uno",
    });
    expect(thinkings[1]).toMatchObject({ type: "text", value: "dos" });
    expect(thinkings[0].id).not.toBe(thinkings[1].id);
  });

  it("deja intactos los pensamientos válidos y es idempotente", () => {
    const input: Thinking[] = [
      { id: "t1", type: "text", value: "hola" },
      { id: "i1", type: "image", value: ["local:a", "local:b"], text: "pie" },
      { id: "i2", type: "image", value: ["local:c"] },
    ];

    const first = parseThinkings(input);
    const second = parseThinkings(first.thinkings);

    expect(first.migrated).toBe(false);
    expect(first.thinkings).toEqual(input);
    expect(second).toEqual(first);
  });

  it("conserva el orden al mezclar strings y objetos", () => {
    const { thinkings } = parseThinkings([
      "a",
      { id: "t2", type: "text", value: "b" },
      "c",
    ]);
    expect(thinkings.map(getThinkingText)).toEqual(["a", "b", "c"]);
  });

  it("conserva tal cual los tipos desconocidos", () => {
    const audio = { id: "x", type: "audio", value: "ref", extra: 1 };
    const { thinkings, migrated } = parseThinkings([audio]);
    expect(migrated).toBe(false);
    expect(thinkings).toEqual([audio]);
  });

  it("descarta elementos inválidos y avisa", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { thinkings, migrated } = parseThinkings([
      null,
      3,
      { type: "text", value: "sin id" },
      { id: "i0", type: "image", value: [] },
      { id: "i6", type: "image", value: ["1", "2", "3", "4", "5", "6"] },
      { id: "t", type: "text", value: 42 },
      { id: "ok", type: "text", value: "ok" },
    ]);

    expect(thinkings).toEqual([{ id: "ok", type: "text", value: "ok" }]);
    expect(migrated).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it("devuelve una lista vacía si la entrada no es un array", () => {
    expect(parseThinkings(undefined)).toEqual({ thinkings: [], migrated: false });
    expect(parseThinkings({})).toEqual({ thinkings: [], migrated: false });
  });

  it("asigna un id nuevo a los ids repetidos", () => {
    const { thinkings, migrated } = parseThinkings([
      { id: "dup", type: "text", value: "a" },
      { id: "dup", type: "text", value: "b" },
    ]);
    expect(migrated).toBe(true);
    expect(thinkings[0].id).toBe("dup");
    expect(thinkings[1].id).toMatch(UUID_RE);
  });
});

describe("helpers", () => {
  it("getThinkingText devuelve el texto según el tipo", () => {
    expect(getThinkingText({ id: "1", type: "text", value: "a" })).toBe("a");
    expect(
      getThinkingText({ id: "2", type: "image", value: ["local:x"], text: "b" }),
    ).toBe("b");
    expect(getThinkingText({ id: "3", type: "image", value: ["local:x"] })).toBe(
      "",
    );
    expect(getThinkingText({ id: "4", type: "audio" })).toBe("");
  });

  it("getImageRefs devuelve las referencias solo de las imágenes", () => {
    expect(getImageRefs({ id: "1", type: "text", value: "a" })).toEqual([]);
    expect(
      getImageRefs({ id: "2", type: "image", value: ["local:x", "u/n/y.webp"] }),
    ).toEqual(["local:x", "u/n/y.webp"]);
  });

  it("isLocalRef distingue referencias locales de remotas", () => {
    expect(isLocalRef("local:abc")).toBe(true);
    expect(isLocalRef("user/note/abc.webp")).toBe(false);
  });
});
