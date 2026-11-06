import {
  Component,
  useCallback,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useNotes } from "@/hooks/useNotes";
import { getNoteAnimation } from "@/hooks/useNoteAnimation";
import {
  closeAnimation,
  openAnimation,
  takeLaunchOrigin,
  type LaunchRect,
  type PanelAnimation,
} from "@/components/utils/noteLaunch";
import ActiveNoteView from "./components/activeNoteView";
import NoActiveNote from "./components/noActiveNote";
import "./styles.css";

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const canAnimate = (el: HTMLElement) =>
  typeof el.animate === "function" && !prefersReducedMotion();

const panelRadius = (el: HTMLElement) =>
  parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;

// Tarjeta de la nota en el sidebar, solo si se ve en pantalla
const findNoteCard = (noteId: string): LaunchRect | null => {
  const card = document.querySelector<HTMLElement>(
    `[data-note-id="${CSS.escape(noteId)}"]`,
  );
  if (!card) return null;
  const rect = card.getBoundingClientRect();
  const isVisible =
    rect.width > 0 &&
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth;
  return isVisible ? rect : null;
};

// "Foto" del panel justo antes de cerrarse, para animarlo mientras se va
interface PanelSnapshot {
  noteId: string;
  clone: HTMLElement;
  rect: DOMRect;
  radius: number;
  // Scroll y texto de cada elemento: cloneNode no los copia
  scrolls: [number, number, number][];
  values: [number, string][];
  wasDeleting: boolean;
}

const takeSnapshot = (el: HTMLElement, noteId: string): PanelSnapshot => {
  const clone = el.cloneNode(true) as HTMLElement;
  const scrolls: [number, number, number][] = [];
  el.querySelectorAll("*").forEach((node, index) => {
    if (node.scrollTop || node.scrollLeft) {
      scrolls.push([index, node.scrollTop, node.scrollLeft]);
    }
  });
  const values: [number, string][] = [];
  el.querySelectorAll("input, textarea").forEach((node, index) => {
    values.push([index, (node as HTMLInputElement).value]);
  });
  return {
    noteId,
    clone,
    rect: el.getBoundingClientRect(),
    radius: panelRadius(el),
    scrolls,
    values,
    wasDeleting: el.classList.contains("note-deleting"),
  };
};

interface PanelPresenceProps {
  noteId: string | undefined;
  panelRef: RefObject<HTMLDivElement | null>;
  onClose: (snapshot: PanelSnapshot) => void;
  children: ReactNode;
}

// Clase porque getSnapshotBeforeUpdate es la única forma de leer el DOM del
// panel antes de que React lo saque al cerrarse la nota
class PanelPresence extends Component<PanelPresenceProps> {
  getSnapshotBeforeUpdate(prevProps: PanelPresenceProps) {
    const panel = this.props.panelRef.current;
    if (!prevProps.noteId || this.props.noteId || !panel) return null;
    return takeSnapshot(panel, prevProps.noteId);
  }

  componentDidUpdate(
    _prevProps: PanelPresenceProps,
    _prevState: unknown,
    snapshot: PanelSnapshot | null,
  ) {
    if (snapshot) this.props.onClose(snapshot);
  }

  render() {
    return this.props.children;
  }
}

const runAnimation = (el: HTMLElement, animation: PanelAnimation) => {
  el.style.transformOrigin = animation.transformOrigin;
  el.classList.add("is-launching");
  return el.animate(animation.keyframes, animation.options);
};

const NoteContent = () => {
  const { activeNoteState, waitingResponse } = useNotes();
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeNoteId = activeNoteState?.id;

  // Al abrir una nota desde el sidebar, el panel entra con la animación elegida
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !activeNoteId) return;
    // Si se estaba yendo otra nota, la copia se quita para no taparla
    stageRef.current
      ?.querySelectorAll(".note-panel-ghost")
      .forEach((ghost) => ghost.remove());
    const card = takeLaunchOrigin(activeNoteId);
    if (!card || !canAnimate(el)) return;

    // Si venía otra apertura en curso, se corta para medir el panel real
    el.getAnimations().forEach((animation) => animation.cancel());
    const animation = openAnimation(getNoteAnimation(), {
      card,
      panel: el.getBoundingClientRect(),
      radius: panelRadius(el),
    });
    if (!animation) return;

    const running = runAnimation(el, animation);
    const done = () => {
      el.classList.remove("is-launching");
      el.style.transformOrigin = "";
    };
    running.onfinish = done;
    running.oncancel = done;
  }, [activeNoteId]);

  // Al cerrarse, una copia del panel se va con la animación elegida
  const handleClose = useCallback((snapshot: PanelSnapshot) => {
    const stage = stageRef.current;
    // Al borrar una nota ya hubo su propia animación (eclipse)
    if (!stage || snapshot.wasDeleting || !canAnimate(stage)) return;

    const animation = closeAnimation(getNoteAnimation(), {
      card: findNoteCard(snapshot.noteId),
      panel: snapshot.rect,
      radius: snapshot.radius,
    });
    if (!animation) return;

    const { clone, rect } = snapshot;
    const stageRect = stage.getBoundingClientRect();
    clone.classList.add("note-panel-ghost");
    clone.classList.remove("is-launching");
    clone.setAttribute("aria-hidden", "true");
    clone.inert = true;
    Object.assign(clone.style, {
      position: "absolute",
      left: `${rect.left - stageRect.left}px`,
      top: `${rect.top - stageRect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: "0",
    });
    stage.appendChild(clone);

    const nodes = clone.querySelectorAll("*");
    snapshot.scrolls.forEach(([index, top, left]) => {
      nodes[index]?.scrollTo(left, top);
    });
    const fields = clone.querySelectorAll<HTMLInputElement>("input, textarea");
    snapshot.values.forEach(([index, value]) => {
      if (fields[index]) fields[index].value = value;
    });

    const running = runAnimation(clone, animation);
    running.onfinish = () => clone.remove();
    running.oncancel = () => clone.remove();
  }, []);

  return (
    <div
      ref={stageRef}
      className={`note-stage${activeNoteState ? " has-note" : ""}`}
    >
      <NoActiveNote hidden={!!activeNoteState} />
      <PanelPresence
        noteId={activeNoteId}
        panelRef={containerRef}
        onClose={handleClose}
      >
        {activeNoteState && (
          <div
            ref={containerRef}
            className={`note-c-container ${waitingResponse === "deletingNote" ? "note-deleting" : ""}`}
          >
            <ActiveNoteView />
          </div>
        )}
      </PanelPresence>
    </div>
  );
};

export default NoteContent;
