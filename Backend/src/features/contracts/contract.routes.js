import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { requireRole } from "../../common/middleware/role.middleware.js";
import { getContracts, getContractById, createContract, updateContract } from "./contract.controller.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin", "hr_manager"), getContracts);
router.get("/:id", requireAuth, requireRole("admin", "hr_manager"), getContractById);
router.post("/", requireAuth, requireRole("admin", "hr_manager"), createContract);
router.put("/:id", requireAuth, requireRole("admin", "hr_manager"), updateContract);

export default router;
