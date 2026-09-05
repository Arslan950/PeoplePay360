import { ApiError } from "../../utils/api-error.js";

const requireRole = (...roles) => (req, res, next) => {
	if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, "Insufficient permissions"));
	next();
};

export { requireRole };
