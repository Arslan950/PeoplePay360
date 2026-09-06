import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { requireRole } from "../../common/middleware/role.middleware.js";
import { getDashboard } from "./dashboard.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("hr_payroll_user", "hr_payroll_manager", "admin"), getDashboard);

export default router;
