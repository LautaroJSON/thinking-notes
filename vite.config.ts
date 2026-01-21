import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  base: "/thinking-notes/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // Actualiza la app automáticamente cuando hay cambios
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Thinking Notes",
        short_name: "Notes",
        description: "Mi app de notas con pensamientos",
        theme_color: "#ffffff",
        icons: [
          {
            src: "iconoapp.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "iconoapp.png",
            sizes: "345x345",
            type: "image/png",
          },
          {
            src: "iconoapp.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable", // Esto es clave para que el icono se vea bien en Android
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
