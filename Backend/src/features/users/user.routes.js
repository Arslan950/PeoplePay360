import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { requireRole } from "../../common/middleware/role.middleware.js";
import { createUser, updateUserRole, deactivateUser, reactivateUser } from "./user.controller.js";

const router = Router();
const adminOnly = [requireAuth, requireRole("admin")];

router.post("/", ...adminOnly, createUser);
router.put("/:id/role", ...adminOnly, updateUserRole);
router.put("/:id/deactivate", ...adminOnly, deactivateUser);
router.put("/:id/reactivate", ...adminOnly, reactivateUser);

export default router;
