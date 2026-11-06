import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NotesProvider } from "@/context/notesContext.tsx";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App.tsx";
import {
  applyThinkingBullet,
  loadThinkingBullet,
} from "@/components/utils/thinkingBullet";

registerSW({ immediate: true });
// Decorado de las ideas elegido (el tema lo aplica el script de index.html)
applyThinkingBullet(loadThinkingBullet());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NotesProvider>
      <App />
    </NotesProvider>
  </StrictMode>,
);
