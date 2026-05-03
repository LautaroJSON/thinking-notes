import { useState, useMemo } from "react";
import type { INotes } from "@/types";

export interface Segment {
  text: string;
  isMatch: boolean;
}

export interface SearchMatch {
  thinkingIndex: number;
  segments: Segment[];
}

export function useNoteSearch(note: INotes | null) {
  const [query, setQuery] = useState("");

  const results: SearchMatch[] = useMemo(() => {
    if (!note || !query.trim()) return [];

    const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");

    return note.thinkings
      .map((paragraph, index) => {
        if (!regex.test(paragraph)) return null;
        regex.lastIndex = 0;

        const segments: Segment[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(paragraph)) !== null) {
          if (match.index > lastIndex) {
            segments.push({
              text: paragraph.slice(lastIndex, match.index),
              isMatch: false,
            });
          }
          segments.push({ text: match[0], isMatch: true });
          lastIndex = regex.lastIndex;
        }

        if (lastIndex < paragraph.length) {
          segments.push({ text: paragraph.slice(lastIndex), isMatch: false });
        }

        return { thinkingIndex: index, segments };
      })
      .filter(Boolean) as SearchMatch[];
  }, [note, query]);

  const matchCount = useMemo(
    () =>
      results.reduce(
        (acc, r) => acc + r.segments.filter((s) => s.isMatch).length,
        0,
      ),
    [results],
  );

  // Map para O(1) lookup por índice de párrafo
  const matchMap = useMemo(
    () => new Map(results.map((r) => [r.thinkingIndex, r.segments])),
    [results],
  );

  return { query, setQuery, results, matchCount, matchMap };
}
