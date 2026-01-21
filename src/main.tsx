import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NotesProvider } from "@/context/notesContext.tsx";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App.tsx";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NotesProvider>
      <App />
    </NotesProvider>
  </StrictMode>,
);
