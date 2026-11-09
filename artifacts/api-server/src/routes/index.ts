import { Router, type IRouter } from "express";
import dashboardRouter from "./dashboard";
import healthRouter from "./health";
import materialsRouter from "./materials";
import projectsRouter from "./projects";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(projectsRouter);
router.use(reportsRouter);
router.use(materialsRouter);

export default router;
