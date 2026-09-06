import { ApiError } from "../../utils/api-error.js";

// Roles.md defines a permission hierarchy: payroll users inherit HR Manager
// permissions and payroll managers inherit payroll-user permissions.
const inheritedRoles = {
	employee: ["employee"],
	hr_manager: ["hr_manager"],
	hr_payroll_user: ["hr_payroll_user", "hr_manager"],
	hr_payroll_manager: ["hr_payroll_manager", "hr_payroll_user", "hr_manager"],
	admin: ["admin", "hr_payroll_manager", "hr_payroll_user", "hr_manager"],
};

const requireRole = (...roles) => (req, res, next) => {
	const permissions = inheritedRoles[req.user?.role] || [];
	if (!roles.some((role) => permissions.includes(role))) return next(new ApiError(403, "Insufficient permissions"));
	next();
};

export { requireRole, inheritedRoles };
