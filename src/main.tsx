import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NotesProvider } from "@/context/notesContext.tsx";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NotesProvider>
      <App />
    </NotesProvider>
  </StrictMode>
);
