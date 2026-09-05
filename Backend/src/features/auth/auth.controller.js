import { User } from "../users/user.model.js";
import { comparePassword } from "../users/user.service.js";
import { createAccessToken } from "./auth.service.js";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";

const cookieOptions = {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "lax",
	maxAge: 24 * 60 * 60 * 1000,
};

const safeUser = (user) => ({ _id: user._id, email: user.email, role: user.role, employee: user.employee, isActive: user.isActive });

const login = asyncHandler(async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) throw new ApiError(400, "email and password are required");

	const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
	if (!user || !(await comparePassword(password, user.passwordHash))) throw new ApiError(401, "Invalid email or password");
	if (!user.isActive) throw new ApiError(403, "User account is inactive");

	const accessToken = createAccessToken(user._id.toString());
	return res.status(200).cookie("accessToken", accessToken, cookieOptions).json(new ApiResponse(200, { user: safeUser(user) }, "Login successful"));
});

const me = asyncHandler(async (req, res) => res.status(200).json(new ApiResponse(200, { user: safeUser(req.user) })));
const logout = asyncHandler(async (req, res) => res.clearCookie("accessToken", cookieOptions).status(200).json(new ApiResponse(200, null, "Logged out")));

export { login, me, logout };
