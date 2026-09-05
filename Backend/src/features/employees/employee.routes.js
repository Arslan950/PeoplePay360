import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { requireRole } from "../../common/middleware/role.middleware.js";
import {
	getEmployees,
	getEmployeeById,
	createEmployee,
	resetEmployeeCredentials,
	updateEmployee,
	deactivateEmployee,
	reactivateEmployee,
} from "./employee.controller.js";

const router = Router();

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, 
    message: {
        success: false,
        message: "Too many password reset attempts from this IP, please try again after 15 minutes"
    },
    standardHeaders: true, 
    legacyHeaders: false, 
});

router.get("/", requireAuth, getEmployees);
router.get("/:id", requireAuth, getEmployeeById);
router.post("/:id/credentials", requireAuth, requireRole("admin", "hr_manager"), resetPasswordLimiter, resetEmployeeCredentials);
router.post("/", requireAuth, requireRole("admin", "hr_manager"), createEmployee);
router.put("/:id", requireAuth, requireRole("admin", "hr_manager"), updateEmployee);
router.put("/:id/deactivate", requireAuth, requireRole("admin", "hr_manager"), deactivateEmployee);
router.put("/:id/reactivate", requireAuth, requireRole("admin", "hr_manager"), reactivateEmployee);

export default router;
