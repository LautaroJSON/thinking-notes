import { useEffect } from "react";
import { soundForInputType } from "@/components/utils/sounds";
import { unlockAudio } from "@/components/utils/soundEngine";
import { playSound } from "./useSounds";

const TEXT_INPUT_TYPES = new Set(["text", "search"]);

const isEditableTextField = (target: EventTarget | null) => {
  if (target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled;
  }
  if (target instanceof HTMLInputElement) {
    return (
      TEXT_INPUT_TYPES.has(target.type) && !target.readOnly && !target.disabled
    );
  }
  return false;
};

// Sonidos de escritura para todos los campos de texto de la app, con un único
// listener global. beforeinput solo se dispara cuando el usuario modifica el
// texto, así que Shift, flechas o atajos no suenan, y el texto que entra por
// dictado (se escribe por código) tampoco. También prepara el audio en cada
// gesto del usuario: los navegadores no dejan sonar antes del primero.
const useTypingSounds = () => {
  useEffect(() => {
    const handleGesture = () => unlockAudio();

    const handleBeforeInput = (event: Event) => {
      if (!(event instanceof InputEvent)) return;
      if (!isEditableTextField(event.target)) return;
      const sound = soundForInputType(event.inputType);
      if (sound) playSound(sound);
    };

    document.addEventListener("pointerdown", handleGesture, true);
    document.addEventListener("keydown", handleGesture, true);
    document.addEventListener("beforeinput", handleBeforeInput, true);
    return () => {
      document.removeEventListener("pointerdown", handleGesture, true);
      document.removeEventListener("keydown", handleGesture, true);
      document.removeEventListener("beforeinput", handleBeforeInput, true);
    };
  }, []);
};

export default useTypingSounds;
