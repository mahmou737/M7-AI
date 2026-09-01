import { Router } from "express";
import chatRouter from "./chat";
import conversationsRouter from "./conversations";
import memoryRouter from "./memory";
import kashierRouter from "./kashier";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/chat", chatRouter);
router.use("/conversations", conversationsRouter);
router.use("/memory", memoryRouter);
router.use("/kashier", kashierRouter);

export default router;
