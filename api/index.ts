import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import apiRouter from "../server/routes/index.js";

const app = express();

// إعداد CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// فحص صحة الخادم
app.get(["/health", "/api/health"], (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "M7 AI Backend",
    timestamp: new Date().toISOString(),
  });
});

// تركيب مسارات الـ API
app.use("/api", apiRouter);
app.use("/", apiRouter);

// معالج 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found",
    path: req.originalUrl || req.url,
  });
});

// معالج الأخطاء العام
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

export default app; 


