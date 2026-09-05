import { Payslip } from "../payroll/payslip.model.js";
import { Payrun } from "../payroll/payrun.model.js";
import { ApiError } from "../../utils/api-error.js";

const parseDate = (value, field) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) throw new ApiError(400, `Invalid ${field}`);
	return date;
};

const getPayrollDashboard = async (filters) => {
	const startDate = parseDate(filters.startDate, "startDate");
	const endDate = parseDate(filters.endDate, "endDate");
	if (startDate && endDate && endDate < startDate) throw new ApiError(400, "endDate must be after startDate");
	const payslipMatch = {};
	if (startDate || endDate) {
		payslipMatch["period.startDate"] = {};
		if (startDate) payslipMatch["period.startDate"].$gte = startDate;
		if (endDate) payslipMatch["period.startDate"].$lte = endDate;
	}
	const employeeMatch = {};
	if (filters.department) employeeMatch["employee.department"] = filters.department;
	if (filters.employeeType) employeeMatch["employee.employeeType"] = filters.employeeType;
	if (filters.company) employeeMatch["employee.company"] = filters.company;
	const pipeline = [
		{ $match: payslipMatch },
		{ $lookup: { from: "employees", localField: "employee", foreignField: "_id", as: "employee" } },
		{ $unwind: "$employee" },
		{ $match: employeeMatch },
	];
	const [summary] = await Payslip.aggregate([...pipeline, { $group: { _id: null, totalNetSalaryPaid: { $sum: "$netSalary" }, payslipsGenerated: { $sum: 1 }, avgSalaryPerEmployee: { $avg: "$netSalary" } } }]);
	const departmentCosts = await Payslip.aggregate([...pipeline, { $group: { _id: { $ifNull: ["$employee.department", "Unassigned"] }, total: { $sum: "$netSalary" } } }, { $sort: { total: -1 } }]);
	const monthlyNetSalaryTrend = await Payslip.aggregate([...pipeline,
		{ $group: { _id: { year: { $year: "$period.startDate" }, month: { $month: "$period.startDate" } }, total: { $sum: "$netSalary" } } },
		{ $sort: { "_id.year": 1, "_id.month": 1 } },
		{ $project: { _id: 0, label: { $dateToString: { format: "%b %Y", date: { $dateFromParts: { year: "$_id.year", month: "$_id.month", day: 1 } } } }, total: 1 } },
	]);
	const payrunFilter = startDate || endDate ? { "period.startDate": payslipMatch["period.startDate"] } : {};
	const [statusCounts, warningCounts, currentPayrun] = await Promise.all([
		Payslip.aggregate([...pipeline, { $group: { _id: "$status", count: { $sum: 1 } } }]),
		Payslip.aggregate([...pipeline, { $match: { warning: { $ne: null } } }, { $group: { _id: "$warning", count: { $sum: 1 } } }]),
		Payrun.findOne(payrunFilter).sort({ "period.startDate": -1 }).select("name period status"),
	]);
	return {
		currentPayrun,
		kpis: { totalNetSalaryPaid: summary?.totalNetSalaryPaid || 0, payslipsGenerated: summary?.payslipsGenerated || 0, avgSalaryPerEmployee: summary?.avgSalaryPerEmployee || 0 },
		departmentCosts: departmentCosts.map((item) => ({ department: item._id, total: item.total })),
		monthlyNetSalaryTrend,
		statusCounts: statusCounts.map((item) => ({ status: item._id, count: item.count })),
		warningCounts: warningCounts.map((item) => ({ warning: item._id, count: item.count })),
	};
};

export { getPayrollDashboard };
