import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import rulesRouter from "./rules";
import scansRouter from "./scans";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(requireAuth);
router.use(dashboardRouter);
router.use(rulesRouter);
router.use(scansRouter);

export default router;
