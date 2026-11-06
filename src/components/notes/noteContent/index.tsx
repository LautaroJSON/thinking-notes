import { useLayoutEffect, useRef } from "react";
import { useNotes } from "@/hooks/useNotes";
import {
  LAUNCH_DURATION_MS,
  LAUNCH_EASING,
  launchKeyframes,
  takeLaunchOrigin,
} from "@/components/utils/noteLaunch";
import ActiveNoteView from "./components/activeNoteView";
import NoActiveNote from "./components/noActiveNote";
import "./styles.css";

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const NoteContent = () => {
  const { activeNoteState, waitingResponse } = useNotes();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeNoteId = activeNoteState?.id;

  // Al abrir una nota desde el sidebar, el panel sale desde su tarjeta
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !activeNoteId) return;
    const origin = takeLaunchOrigin(activeNoteId);
    if (!origin || prefersReducedMotion() || typeof el.animate !== "function") {
      return;
    }

    // Si venía otra apertura en curso, se corta para medir el panel real
    el.getAnimations().forEach((animation) => animation.cancel());
    const toRadius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const keyframes = launchKeyframes(origin, el.getBoundingClientRect(), {
      toRadius,
    });
    if (!keyframes) return;

    el.classList.add("is-launching");
    const animation = el.animate(keyframes, {
      duration: LAUNCH_DURATION_MS,
      easing: LAUNCH_EASING,
    });
    const done = () => el.classList.remove("is-launching");
    animation.onfinish = done;
    animation.oncancel = done;
  }, [activeNoteId]);

  return (
    <div
      ref={containerRef}
      className={`note-c-container ${waitingResponse === "deletingNote" ? "note-deleting" : ""}`}
    >
      {activeNoteState ? <ActiveNoteView /> : <NoActiveNote />}
    </div>
  );
};

export default NoteContent;
