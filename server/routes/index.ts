import { Router } from "express";
import chatRouter from "./chat";
import conversationsRouter from "./conversations";
import memoryRouter from "./memory";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/chat", chatRouter);
router.use("/conversations", conversationsRouter);
router.use("/memory", memoryRouter);

export default router;
