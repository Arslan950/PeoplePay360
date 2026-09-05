import { Router } from "express";
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

router.get("/", requireAuth, getEmployees);
router.get("/:id", requireAuth, getEmployeeById);
router.post("/:id/credentials", requireAuth, requireRole("admin", "hr_manager"), resetEmployeeCredentials);
router.post("/", requireAuth, requireRole("admin", "hr_manager"), createEmployee);
router.put("/:id", requireAuth, requireRole("admin", "hr_manager"), updateEmployee);
router.put("/:id/deactivate", requireAuth, requireRole("admin", "hr_manager"), deactivateEmployee);
router.put("/:id/reactivate", requireAuth, requireRole("admin", "hr_manager"), reactivateEmployee);

export default router;
