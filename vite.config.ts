import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@workspace/api-client-react": path.resolve(__dirname, "lib/api-client-react/src"),
      "@workspace/api-zod": path.resolve(__dirname, "lib/api-zod/src"),
      "@workspace/db": path.resolve(__dirname, "lib/db/src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
