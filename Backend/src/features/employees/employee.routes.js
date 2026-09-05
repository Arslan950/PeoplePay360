import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { requireRole } from "../../common/middleware/role.middleware.js";
import {
	getEmployees,
	getEmployeeById,
	createEmployee,
	updateEmployee,
	deactivateEmployee,
	reactivateEmployee,
} from "./employee.controller.js";

const router = Router();

router.get("/", requireAuth, getEmployees);
router.get("/:id", requireAuth, getEmployeeById);
router.post("/", requireAuth, requireRole("admin"), createEmployee);
router.put("/:id", requireAuth, requireRole("admin"), updateEmployee);
router.put("/:id/deactivate", requireAuth, requireRole("admin"), deactivateEmployee);
router.put("/:id/reactivate", requireAuth, requireRole("admin"), reactivateEmployee);

export default router;
