import express from "express";
import path from "path";
import http from "http";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import apiRouter from "./server/routes";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Single HTTP server so Vite's HMR WebSocket shares the same
  // (proxied) origin/port instead of a separate, unreachable one.
  const httpServer = http.createServer(app);

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API routes FIRST
  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Attach HMR to the existing HTTP server so the client
        // WebSocket connects through the same proxied port (3000).
        hmr: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
