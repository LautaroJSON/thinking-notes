import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { INotes } from "@/types";
import { useNoteSearch } from "./useNoteSearch";

const NOTE: INotes = {
  id: "n1",
  title: "Nota",
  thinkings: [
    { id: "t1", type: "text", value: "Comprar pan" },
    { id: "i1", type: "image", value: ["local:a"], text: "Foto del pan" },
    { id: "i2", type: "image", value: ["local:b"] },
    { id: "x1", type: "audio", value: "pan" },
  ],
};

describe("useNoteSearch", () => {
  it("busca en el texto y en el texto que acompaña a las imágenes", () => {
    const { result } = renderHook(() => useNoteSearch(NOTE));

    act(() => result.current.setQuery("pan"));

    expect(result.current.results.map((r) => r.thinkingId)).toEqual([
      "t1",
      "i1",
    ]);
    expect(result.current.matchCount).toBe(2);
    expect(result.current.matchMap.get("i1")).toEqual([
      { text: "Foto del ", isMatch: false },
      { text: "pan", isMatch: true },
    ]);
  });

  it("no encuentra nada en imágenes sin texto", () => {
    const { result } = renderHook(() => useNoteSearch(NOTE));
    act(() => result.current.setQuery("local"));
    expect(result.current.results).toEqual([]);
  });
});
