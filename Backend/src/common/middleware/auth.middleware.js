import jwt from "jsonwebtoken";
import { User } from "../../features/users/user.model.js";
import { ApiError } from "../../utils/api-error.js";
import { asyncHandler } from "../../utils/async-handler.js";

const getToken = (req) => req.cookies?.accessToken || req.get("Authorization")?.replace(/^Bearer\s+/i, "");

const requireAuth = asyncHandler(async (req, res, next) => {
	const token = getToken(req);
	if (!token) throw new ApiError(401, "Authentication required");

	let payload;
	try {
		payload = jwt.verify(token, process.env.JWT_SECRET);
	} catch {
		throw new ApiError(401, "Invalid or expired authentication token");
	}

	const user = await User.findById(payload.userId).select("email role employee isActive");
	if (!user) throw new ApiError(401, "User account not found");
	if (!user.isActive) throw new ApiError(403, "User account is inactive");
	req.user = user;
	next();
});

export { requireAuth };
