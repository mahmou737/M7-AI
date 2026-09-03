import { Router } from "express";
import chatRouter from "./chat.js";
import conversationsRouter from "./conversations.js";
import memoryRouter from "./memory.js";
import kashierRouter from "./kashier.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/chat", chatRouter);
router.use("/conversations", conversationsRouter);
router.use("/memory", memoryRouter);
router.use("/kashier", kashierRouter);

export default router;
