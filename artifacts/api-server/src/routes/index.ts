import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import businessUnitsRouter from "./businessUnits";
import customersRouter from "./customers";
import dealsRouter from "./deals";
import financeRouter from "./finance";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(businessUnitsRouter);
router.use(customersRouter);
router.use(dealsRouter);
router.use(financeRouter);
router.use(reportsRouter);

export default router;
