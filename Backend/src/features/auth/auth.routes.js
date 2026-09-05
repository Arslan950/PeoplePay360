import { Router } from "express";
import { signIn } from "./auth.controller.js";

const router = Router();

// Sign-in must be public; no verifyJWT or authorizeRoles middleware should be applied here.
router.route("/sign-in").post(signIn);

export default router;