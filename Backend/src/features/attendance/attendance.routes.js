import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { requireRole } from "../../common/middleware/role.middleware.js";
import { getAttendance, checkIn, checkOut, correctAttendance } from "./attendance.controller.js";

const router = Router();

router.get("/", requireAuth, getAttendance);
router.post("/check-in", requireAuth, checkIn);
router.post("/:id/check-out", requireAuth, checkOut);
router.put("/:id", requireAuth, requireRole("admin"), correctAttendance);

export default router;
