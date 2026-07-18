import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import conversationsRouter from "./conversations";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/chat", chatRouter);
router.use("/conversations", conversationsRouter);

export default router;
