import type { Segment } from "@/hooks/useNoteSearch";

// Renderiza un párrafo con los matches de la búsqueda resaltados
const HighlightedText = ({ segments }: { segments: Segment[] }) => (
  <>
    {segments.map((seg, i) =>
      seg.isMatch ? (
        <mark key={i} className="thinking-highlight">
          {seg.text}
        </mark>
      ) : (
        <span key={i}>{seg.text}</span>
      ),
    )}
  </>
);

export default HighlightedText;
