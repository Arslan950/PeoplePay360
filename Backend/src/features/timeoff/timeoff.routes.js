import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { requireRole } from "../../common/middleware/role.middleware.js";
import {
	getTimeoffTypes,
	createTimeoffType,
	updateTimeoffType,
	getAllocations,
	createAllocation,
	getRequests,
	createRequest,
	approveRequest,
	refuseRequest,
} from "./timeoff.controller.js";

const router = Router();

// Time Off Types routes
router.get("/types", requireAuth, getTimeoffTypes);
router.post("/types", requireAuth, requireRole("admin", "hr_manager"), createTimeoffType);
router.put("/types/:id", requireAuth, requireRole("admin", "hr_manager"), updateTimeoffType);

// Allocations routes
router.get("/allocations", requireAuth, getAllocations);
router.post("/allocations", requireAuth, requireRole("admin", "hr_manager"), createAllocation);

// Requests routes
router.get("/requests", requireAuth, getRequests);
router.post("/requests", requireAuth, createRequest);
router.post("/requests/:id/approve", requireAuth, requireRole("admin", "hr_manager"), approveRequest);
router.post("/requests/:id/refuse", requireAuth, requireRole("admin", "hr_manager"), refuseRequest);

export default router;
