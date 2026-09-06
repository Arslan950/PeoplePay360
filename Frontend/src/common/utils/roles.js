export const HR_ROLES = ["hr_manager", "hr_payroll_user", "hr_payroll_manager", "admin"];
export const PAYROLL_ROLES = ["hr_payroll_user", "hr_payroll_manager", "admin"];
export const PAYROLL_MANAGER_ROLES = ["hr_payroll_manager", "admin"];

export const canAccess = (user, roles) => Boolean(user && roles.includes(user.role));
