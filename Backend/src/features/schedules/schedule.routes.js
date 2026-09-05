import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { requireRole } from "../../common/middleware/role.middleware.js";
import {
	getSchedules,
	getScheduleById,
	createSchedule,
	updateSchedule,
	archiveSchedule,
	reactivateSchedule,
} from "./schedule.controller.js";

const router = Router();

router.get("/", requireAuth, getSchedules);
router.get("/:id", requireAuth, getScheduleById);
router.post("/", requireAuth, requireRole("admin", "hr_manager"), createSchedule);
router.put("/:id", requireAuth, requireRole("admin", "hr_manager"), updateSchedule);
router.put("/:id/archive", requireAuth, requireRole("admin", "hr_manager"), archiveSchedule);
router.put("/:id/reactivate", requireAuth, requireRole("admin", "hr_manager"), reactivateSchedule);

export default router;
