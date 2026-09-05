import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { login, me, logout } from "./auth.controller.js";

const router = Router();

router.post("/login", login);
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, logout);


export default router;
