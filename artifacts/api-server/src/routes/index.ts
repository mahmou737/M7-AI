import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import conversationsRouter from "./conversations";
import memoryRouter from "./memory";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/chat", chatRouter);
router.use("/conversations", conversationsRouter);
router.use("/memory", memoryRouter);   // ← Persistent user memory

export default router;
