# Contract: botón de dictado e integración en `ActiveNoteView`

**Feature**: [spec.md](../spec.md) | **Hook**: [use-speech-dictation.md](./use-speech-dictation.md)

## Componente `DictationButton`

`src/components/notes/noteContent/components/dictationButton.tsx`

```ts
interface DictationButtonProps {
  status: "idle" | "listening";
  onToggle: () => void;     // clic con mouse/pen o teclado
  onHoldStart: () => void;  // pointerdown táctil
  onHoldEnd: (durationMs: number) => void; // pointerup/cancel/leave táctil
}
```

| Aspecto | Contrato |
|---|---|
| Visibilidad | Lo renderiza el padre solo si `isSupported` (FR-001, clarificación Q4). |
| Ubicación | Junto al campo de nueva idea, alineado a su esquina inferior derecha. |
| Icono | `Mic` de lucide (idle) / `Mic` con estilo activo y pulso sutil (listening). Sin animaciones bloqueantes (Principio II). |
| Accesibilidad (FR-008) | `<button type="button">`, `aria-label="Dictar por voz"`, `aria-pressed={status === "listening"}`, `title` "Dictar por voz" en escritorio. Operable con Enter/Espacio. |
| Mouse/pen/teclado | `click` → `onToggle`. Se ignora el `click` que sigue a un toque (research R4). |
| Táctil | `pointerdown` (`pointerType === "touch"`) → `preventDefault` + `onHoldStart`; `pointerup` / `pointercancel` / `pointerleave` → `onHoldEnd(duración)`. Sin `setPointerCapture`. |
| Anti-menús (FR-014) | CSS `touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;` y `onContextMenu` con `preventDefault`. |
| Foco | `onMouseDown` con `preventDefault`, para que el clic no le saque el foco al textarea. |

## Integración en `ActiveNoteView`

| Regla | Detalle |
|---|---|
| Campo controlado | `const [draft, setDraft] = useState("")`; `value = composeDraft(draft, interimText)`; `onChange → setDraft(stripInterim(e.target.value, interimText))`. |
| `onFinalText` | `setDraft(d => appendTranscript(d, text))`. |
| Enter | `const text = composeDraft(draft, interimText).trim()`; si no está vacío → `handleNewThinking(text)`; `setDraft("")`; si `status === "listening"` → `resetSegment()`. Shift+Enter conserva el salto de línea. |
| Hold end | `stop()`; si `durationMs < 300` → `showHint("short-tap")` (US2-4). |
| Cambio de nota | `useEffect(() => cancel, [activeNoteState?.id])`. |
| Segundo plano | listener de `visibilitychange` → `cancel()` si `document.hidden`. Si `mode === "hold"`, `blur` de `window` → `stop()`. |
| Mensajes | `<p className="dictation-message" role="status" aria-live="polite">` debajo del campo, solo si hay `message`. |
| Placeholder | Mientras `status === "listening"` y `draft` está vacío: "Escuchando…". |
| Edición y buscador | El dictado no toca el textarea de edición de ideas ni el input del buscador. |
