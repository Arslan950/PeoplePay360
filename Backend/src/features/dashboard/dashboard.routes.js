import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { getDashboard } from "./dashboard.controller.js";

const router = Router();

router.get("/", requireAuth, getDashboard);

export default router;
