import { Attendance } from "../attendance/attendance.model.js";
import { attachComputedFields } from "../attendance/attendance.controller.js";
import { Contract } from "../contracts/contract.model.js";
import { Employee } from "../employees/employee.model.js";
import { Allocation } from "../timeoff/allocation.model.js";
import { Request as TimeoffRequest } from "../timeoff/request.model.js";
import { TimeoffType } from "../timeoff/timeoffType.model.js";
import { Payslip } from "../payroll/payslip.model.js";
import { Payrun } from "../payroll/payrun.model.js";
import { getExpectedWorkingDates, getScheduleEntryForDate, overlapDays } from "../payroll/payrollAttendance.service.js";
import { ApiError } from "../../utils/api-error.js";

const parseDate = (value, label) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) throw new ApiError(400, `Invalid ${label}`);
	return date;
};

const toAttendanceDate = (value) => {
	const date = new Date(value);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const toId = (value) => String(value?._id || value);

const checkInMinutes = (value) => {
	const date = new Date(value);
	return (date.getHours() * 60) + date.getMinutes();
};

const timeToMinutes = (value) => {
	if (typeof value !== "string") return Number.NaN;
	const match = value.match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return Number.NaN;
	return (Number(match[1]) * 60) + Number(match[2]);
};

const employeeScopeFrom = (filters) => {
	const scope = {};
	if (filters.department) scope.department = filters.department;
	if (filters.employeeType) scope.employeeType = filters.employeeType;
	if (filters.company) scope.company = filters.company;
	return scope;
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
	const employeeScope = employeeScopeFrom(filters);
	const employeeMatch = Object.fromEntries(
		Object.entries(employeeScope).map(([field, value]) => [`employee.${field}`, value]),
	);
	const payrollPipeline = [
		{ $match: payslipMatch },
		{ $lookup: { from: "employees", localField: "employee", foreignField: "_id", as: "employee" } },
		{ $unwind: "$employee" },
		{ $match: employeeMatch },
	];

	const [[summary], departmentCosts, monthlyNetSalaryTrend, scopedEmployees] = await Promise.all([
		Payslip.aggregate([
			...payrollPipeline,
			{ $group: { _id: null, totalNetSalaryPaid: { $sum: "$netSalary" }, payslipsGenerated: { $sum: 1 }, avgSalaryPerEmployee: { $avg: "$netSalary" } } },
		]),
		Payslip.aggregate([
			...payrollPipeline,
			{ $group: { _id: { $ifNull: ["$employee.department", "Unassigned"] }, total: { $sum: "$netSalary" } } },
			{ $sort: { total: -1 } },
		]),
		Payslip.aggregate([
			...payrollPipeline,
			{ $group: { _id: { year: { $year: "$period.startDate" }, month: { $month: "$period.startDate" } }, total: { $sum: "$netSalary" } } },
			{ $sort: { "_id.year": 1, "_id.month": 1 } },
			{ $project: { _id: 0, label: { $dateToString: { format: "%b %Y", date: { $dateFromParts: { year: "$_id.year", month: "$_id.month", day: 1 } } } }, total: 1 } },
		]),
		Employee.find(employeeScope).populate("workingSchedule", "name weeklyPattern weeklyHours").lean(),
	]);

	const scopedEmployeeIds = scopedEmployees.map((employee) => employee._id);
	const activeEmployees = scopedEmployees.filter((employee) => employee.status === "active");
	const activeEmployeeIds = activeEmployees.map((employee) => employee._id);
	const employeeFiltersApplied = Object.keys(employeeScope).length > 0;
	const payrunPeriodFilter = startDate || endDate ? { "period.startDate": payslipMatch["period.startDate"] } : {};
	const payrunScope = { ...payrunPeriodFilter };
	if (employeeFiltersApplied) payrunScope.employees = { $in: scopedEmployeeIds };

	const attendanceFilter = { employee: { $in: activeEmployeeIds } };
	if (startDate || endDate) {
		attendanceFilter.date = {};
		if (startDate) attendanceFilter.date.$gte = toAttendanceDate(startDate);
		if (endDate) attendanceFilter.date.$lte = toAttendanceDate(endDate);
	}
	const timeoffOverlapFilter = { employee: { $in: scopedEmployeeIds } };
	if (startDate) timeoffOverlapFilter.endDate = { $gte: startDate };
	if (endDate) timeoffOverlapFilter.startDate = { $lte: endDate };
	const now = new Date();
	const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

	const [statusCounts, warningCounts, currentPayrun, attendanceRecords, runningContracts, timeoffTypes, timeoffRequests, allocations, unvalidatedPayrunCount, expiringContractsCount] = await Promise.all([
		Payslip.aggregate([...payrollPipeline, { $group: { _id: "$status", count: { $sum: 1 } } }]),
		Payslip.aggregate([...payrollPipeline, { $match: { warning: { $ne: null } } }, { $group: { _id: "$warning", count: { $sum: 1 } } }]),
		Payrun.findOne(payrunScope).sort({ "period.startDate": -1 }).select("name period status"),
		Attendance.find(attendanceFilter)
			.populate({ path: "employee", select: "workingSchedule", populate: { path: "workingSchedule", select: "name weeklyPattern weeklyHours" } })
			.lean(),
		Contract.find({
			employee: { $in: activeEmployeeIds },
			status: "running",
			startDate: { $lte: now },
			$or: [{ endDate: null }, { endDate: { $gte: now } }],
		}).sort({ startDate: -1 }).populate("workingSchedule", "name weeklyPattern weeklyHours").lean(),
		TimeoffType.find({ status: "active" }).lean(),
		TimeoffRequest.find(timeoffOverlapFilter).select("timeoffType startDate endDate status").lean(),
		Allocation.find({ employee: { $in: scopedEmployeeIds } }).select("employee timeoffType totalDays takenDays").lean(),
		Payrun.countDocuments({ ...payrunScope, status: { $in: ["draft", "computed"] } }),
		Contract.countDocuments({
			employee: { $in: scopedEmployeeIds },
			status: "running",
			endDate: { $gte: currentMonthStart, $lt: nextMonthStart },
		}),
	]);

	const attendanceDatesByEmployee = new Map();
	for (const record of attendanceRecords) {
		const employeeId = toId(record.employee);
		if (!attendanceDatesByEmployee.has(employeeId)) attendanceDatesByEmployee.set(employeeId, new Set());
		attendanceDatesByEmployee.get(employeeId).add(record.date);
	}
	const presentRecords = attendanceRecords.filter((record) => record.status === "closed");
	let lateCount = 0;
	let overtimeCount = 0;
	for (const record of presentRecords) {
		const schedule = record.employee?.workingSchedule;
		const scheduleEntry = getScheduleEntryForDate(schedule, record.checkIn);
		const scheduledStart = timeToMinutes(scheduleEntry?.startTime);
		if (scheduleEntry?.isWorkingDay && Number.isFinite(scheduledStart) && checkInMinutes(record.checkIn) > scheduledStart) lateCount += 1;

		// Use the same overtime calculation returned by the Attendance API.
		if (attachComputedFields(record).overtime > 0) overtimeCount += 1;
	}
	const contractByEmployee = new Map();
	for (const contract of runningContracts) {
		const employeeId = toId(contract.employee);
		if (!contractByEmployee.has(employeeId)) contractByEmployee.set(employeeId, contract);
	}
	let absentCount = 0;
	if (startDate && endDate) {
		const attendancePeriod = { startDate, endDate };
		for (const employee of activeEmployees) {
			const contract = contractByEmployee.get(toId(employee));
			const schedule = contract?.workingSchedule || employee.workingSchedule;
			const recordedDates = attendanceDatesByEmployee.get(toId(employee)) || new Set();
			for (const expectedDate of getExpectedWorkingDates(attendancePeriod, schedule)) {
				if (!recordedDates.has(expectedDate)) absentCount += 1;
			}
		}
	}
	const presentCount = presentRecords.length;
	const attendanceHealth = presentCount + absentCount > 0
		? Number(((presentCount / (presentCount + absentCount)) * 100).toFixed(1))
		: 0;
	const today = toAttendanceDate(now);
	const attendanceOverview = {
		presentCount,
		lateCount,
		absentCount,
		overtimeCount,
		missingCheckouts: attendanceRecords.filter((record) => record.status === "open" && record.date < today).length,
		manualEdits: attendanceRecords.filter((record) => record.wasCorrected === true).length,
		attendanceCoverage: attendanceHealth,
	};

	const requestsByType = new Map();
	for (const request of timeoffRequests) {
		const typeId = toId(request.timeoffType);
		if (!requestsByType.has(typeId)) requestsByType.set(typeId, []);
		requestsByType.get(typeId).push(request);
	}
	const allocationsByType = new Map();
	for (const allocation of allocations) {
		const typeId = toId(allocation.timeoffType);
		if (!allocationsByType.has(typeId)) allocationsByType.set(typeId, []);
		allocationsByType.get(typeId).push(allocation);
	}
	const timeoffOverview = timeoffTypes.map((type) => {
		const typeRequests = requestsByType.get(toId(type)) || [];
		const approvedDays = typeRequests
			.filter((request) => request.status === "approved")
			.reduce((total, request) => total + overlapDays(request, {
				startDate: startDate || request.startDate,
				endDate: endDate || request.endDate,
			}), 0);
		const pendingCount = typeRequests.filter((request) => request.status === "pending").length;
		const remainingBalance = type.requiresAllocation
			? Number((allocationsByType.get(toId(type)) || []).reduce((total, allocation) => total + (Number(allocation.totalDays) - Number(allocation.takenDays)), 0).toFixed(2))
			: "N/A";
		return { type: type.name, approvedDays, pendingCount, remainingBalance };
	});
	const approvedTimeOffDays = timeoffOverview.reduce((total, type) => total + type.approvedDays, 0);

	const departmentOverviewMap = new Map(activeEmployees.map((employee) => [employee.department || "Unassigned", { department: employee.department || "Unassigned", headcount: 0, monthlySalary: 0 }]));
	for (const employee of activeEmployees) {
		const department = employee.department || "Unassigned";
		const row = departmentOverviewMap.get(department);
		row.headcount += 1;
		const contract = contractByEmployee.get(toId(employee));
		// This is current contract run-rate cost, intentionally not the historical payslip-net chart above.
		row.monthlySalary += Number(contract?.wageMonthly || 0);
	}
	const departmentOverview = [...departmentOverviewMap.values()].sort((left, right) => right.monthlySalary - left.monthlySalary || left.department.localeCompare(right.department));

	const missingBankAccountCount = activeEmployees.filter((employee) => !employee.bankDetails?.accountNumber?.trim()).length;
	const duplicatePayslipWarnings = warningCounts
		.filter((warning) => warning._id === "Duplicate")
		.reduce((total, warning) => total + warning.count, 0);
	const alerts = [];
	if (missingBankAccountCount) alerts.push(`${missingBankAccountCount} employee${missingBankAccountCount === 1 ? "" : "s"} missing bank account`);
	if (duplicatePayslipWarnings) alerts.push(`${duplicatePayslipWarnings} duplicate payslip warning${duplicatePayslipWarnings === 1 ? "" : "s"}`);
	if (unvalidatedPayrunCount) alerts.push(`${unvalidatedPayrunCount} draft${unvalidatedPayrunCount === 1 ? "" : "s"} still not validated`);
	if (expiringContractsCount) alerts.push(`${expiringContractsCount} contract${expiringContractsCount === 1 ? "" : "s"} expiring this month`);

	return {
		currentPayrun,
		kpis: {
			totalNetSalaryPaid: summary?.totalNetSalaryPaid || 0,
			payslipsGenerated: summary?.payslipsGenerated || 0,
			avgSalaryPerEmployee: summary?.avgSalaryPerEmployee || 0,
			approvedTimeOffDays,
			attendanceHealth,
		},
		departmentCosts: departmentCosts.map((item) => ({ department: item._id, total: item.total })),
		monthlyNetSalaryTrend,
		statusCounts: statusCounts.map((item) => ({ status: item._id, count: item.count })),
		warningCounts: warningCounts.map((item) => ({ warning: item._id, count: item.count })),
		attendanceOverview,
		timeoffOverview,
		departmentOverview,
		alerts,
	};
};

export { getPayrollDashboard };
