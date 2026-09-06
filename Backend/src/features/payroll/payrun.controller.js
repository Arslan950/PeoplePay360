import mongoose from "mongoose";
import { Employee } from "../employees/employee.model.js";
import { Contract } from "../contracts/contract.model.js";
import { SalaryStructure } from "./salaryStructure.model.js";
import { Payrun } from "./payrun.model.js";
import { Payslip } from "./payslip.model.js";
import { computePayslip } from "./ruleEngine.service.js";
import { resolveWorkforceMetrics } from "./payrollAttendance.service.js";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { generatePayslipPdfBuffer } from "./pdf.service.js";
import { sendPayslipEmail } from "./email.service.js";

const validateObjectId = (id, label = "id") => {
	if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label} id`);
};

const validPeriod = (period) => {
	if (!period?.startDate || !period?.endDate) throw new ApiError(400, "A start and end date are required");
	const startDate = new Date(period.startDate);
	const endDate = new Date(period.endDate);
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
		throw new ApiError(400, "Provide a valid payrun period");
	}
	const periodDays = Math.floor((endDate - startDate) / 86400000) + 1;
	if (periodDays > 31) throw new ApiError(400, "Payrun periods cannot exceed 31 days");
	if (endDate > new Date()) throw new ApiError(400, "Payrun period cannot end in the future");
	return { startDate, endDate };
};

const contractOverlapsPeriod = (contract, period) => {
	const contractStart = new Date(contract.startDate);
	const contractEnd = contract.endDate ? new Date(contract.endDate) : null;
	return contract.status === "running"
		&& contractStart <= new Date(period.endDate)
		&& (!contractEnd || contractEnd >= new Date(period.startDate));
};

const nextPayrunCode = async () => {
	const year = new Date().getFullYear();
	const count = await Payrun.countDocuments({
		createdAt: { $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)) },
	});
	return `PAYRUN/${year}/${String(count + 1).padStart(4, "0")}`;
};

const findRunningContract = (employeeId, period) => Contract.findOne({
	employee: employeeId,
	status: "running",
	startDate: { $lte: new Date(period.endDate) },
	$or: [{ endDate: null }, { endDate: { $gte: new Date(period.startDate) } }],
}).populate("workingSchedule", "name weeklyHours weeklyPattern").sort({ startDate: -1 });

const buildEligibleEmployeeList = async (period) => {
	const employees = await Employee.find({ status: "active" })
		.populate("workingSchedule", "name weeklyHours weeklyPattern")
		.sort({ name: 1 });
	const eligible = [];
	for (const employee of employees) {
		const contract = await findRunningContract(employee._id, period);
		if (!contract || !contractOverlapsPeriod(contract, period)) continue;
		eligible.push({
			_id: employee._id,
			name: employee.name,
			department: employee.department,
			contract: contract._id,
			workingHours: (contract.workingSchedule || employee.workingSchedule)?.weeklyHours
				? `${(contract.workingSchedule || employee.workingSchedule).weeklyHours} hrs/week`
				: ((contract.workingSchedule || employee.workingSchedule)?.name || "Not assigned"),
			startDate: contract.startDate,
			wage: Number(contract.wageMonthly || 0),
		});
	}
	return eligible;
};

const listPayruns = asyncHandler(async (req, res) => {
	const payruns = await Payrun.find()
		.populate("salaryStructure", "name")
		.sort({ "period.startDate": -1, createdAt: -1 });
	return res.status(200).json(new ApiResponse(200, payruns));
});

const getPayrunById = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "payrun");
	const payrun = await Payrun.findById(req.params.id).populate("salaryStructure", "name description");
	if (!payrun) throw new ApiError(404, "Payrun not found");
	const payslips = await Payslip.find({ payrun: payrun._id })
		.populate("employee", "name department")
		.populate("contract", "code wageMonthly")
		.sort({ createdAt: 1 });
	return res.status(200).json(new ApiResponse(200, { payrun, payslips }));
});

const createDraftPayrun = asyncHandler(async (req, res) => {
	const { name, salaryStructureId, period } = req.body || {};
	if (!name?.trim() || !salaryStructureId) throw new ApiError(400, "name and salaryStructureId are required");
	validateObjectId(salaryStructureId, "salaryStructure");
	const normalizedPeriod = validPeriod(period);
	const salaryStructure = await SalaryStructure.findById(salaryStructureId);
	if (!salaryStructure) throw new ApiError(404, "Salary structure not found");
	const draft = await Payrun.create({
		code: await nextPayrunCode(),
		name: name.trim(),
		salaryStructure: salaryStructure._id,
		period: normalizedPeriod,
		createdBy: req.user._id,
	});
	const eligibleEmployees = await buildEligibleEmployeeList(normalizedPeriod);
	return res.status(201).json(new ApiResponse(201, { payrun: draft, eligibleEmployees }, "Choose employee records to create this payrun"));
});

const setEmployeesOnPayrun = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "payrun");
	const payrun = await Payrun.findById(req.params.id);
	if (!payrun) throw new ApiError(404, "Payrun not found");
	if (payrun.status !== "draft") throw new ApiError(409, "Only draft payruns can receive employee selections");
	const employeeIds = Array.isArray(req.body?.employeeIds) ? [...new Set(req.body.employeeIds)] : [];
	if (!employeeIds.length) throw new ApiError(400, "Select at least one employee");
	employeeIds.forEach((employeeId) => validateObjectId(employeeId, "employee"));
	const eligibleEmployees = await buildEligibleEmployeeList(payrun.period);
	const eligibleIds = new Set(eligibleEmployees.map((employee) => employee._id.toString()));
	if (employeeIds.some((employeeId) => !eligibleIds.has(employeeId.toString()))) {
		throw new ApiError(400, "One or more selected employees are not eligible for this payrun period");
	}
	payrun.employees = employeeIds;
	await payrun.save();
	return res.status(200).json(new ApiResponse(200, payrun, "Payrun created"));
});

const computePayrun = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "payrun");
	const payrun = await Payrun.findById(req.params.id).populate("salaryStructure");
	if (!payrun) throw new ApiError(404, "Payrun not found");
	if (!['draft', 'computed'].includes(payrun.status)) throw new ApiError(409, "Only draft or computed payruns can be computed");
	if (!payrun.employees.length) throw new ApiError(400, "Add employees before computing the payrun");
	const structureWithRules = payrun.salaryStructure;
	const skipped = [];
	const payslips = [];

	for (const employeeId of payrun.employees) {
		const employee = await Employee.findById(employeeId)
			.populate("workingSchedule", "name weeklyHours weeklyPattern");
		if (!employee) {
			skipped.push({ employeeId, reason: "Employee not found" });
			continue;
		}
		const contract = await findRunningContract(employee._id, payrun.period);
		if (!contract || !contractOverlapsPeriod(contract, payrun.period)) {
			skipped.push({ employeeId: employee._id, employee: employee.name, reason: "No running contract for this period" });
			continue;
		}
		const metrics = await resolveWorkforceMetrics(employee, contract, payrun.period);
		const computation = computePayslip(contract, structureWithRules, metrics);
		const existingPayslip = await Payslip.findOne({ payrun: payrun._id, employee: employee._id });
		const warning = existingPayslip ? "Duplicate" : (!employee.bankDetails?.accountNumber ? "A/C missing" : null);
		const payload = {
			payrun: payrun._id, employee: employee._id, contract: contract._id, period: payrun.period,
			lines: computation.lines, ...metrics, warning,
			basicSalary: computation.basicSalary, grossSalary: computation.grossSalary,
			totalDeductions: computation.totalDeductions, netSalary: computation.netSalary, status: "computed",
		};
		if (existingPayslip) {
			Object.assign(existingPayslip, payload);
			await existingPayslip.save();
			payslips.push(existingPayslip);
		} else {
			payslips.push(await Payslip.create(payload));
		}
	}
	const computedPayslips = await Payslip.find({ payrun: payrun._id });
	payrun.warnings = computedPayslips.map((payslip) => payslip.warning).filter(Boolean);
	payrun.status = "computed";
	await payrun.save();
	return res.status(200).json(new ApiResponse(200, { payrun, payslips, skipped }, "Payrun computed"));
});

const validatePayrun = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "payrun");
	const payrun = await Payrun.findById(req.params.id);
	if (!payrun) throw new ApiError(404, "Payrun not found");
	if (payrun.status !== "computed") throw new ApiError(409, "Compute the payrun before validating it");
	payrun.status = "validated";
	await payrun.save();
	await Payslip.updateMany({ payrun: payrun._id }, { status: "validated" });
	return res.status(200).json(new ApiResponse(200, { payrun, warnings: payrun.warnings }, "Payrun validated"));
});

const markPaidPayrun = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "payrun");
	const payrun = await Payrun.findById(req.params.id);
	if (!payrun) throw new ApiError(404, "Payrun not found");
	if (payrun.status !== "validated") throw new ApiError(409, "Validate the payrun before marking it paid");
	payrun.status = "paid";
	await payrun.save();
	await Payslip.updateMany({ payrun: payrun._id }, { status: "paid" });
	return res.status(200).json(new ApiResponse(200, payrun, "Payrun marked paid"));
});

const deletePayrun = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "payrun");
	const payrun = await Payrun.findById(req.params.id);
	if (!payrun) throw new ApiError(404, "Payrun not found");
	if (payrun.status === "paid") throw new ApiError(409, "Paid payruns cannot be deleted");
	await Payslip.deleteMany({ payrun: payrun._id });
	await payrun.deleteOne();
	return res.status(200).json(new ApiResponse(200, null, "Payrun deleted"));
});

const sendPayslips = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "payrun");
	const payrun = await Payrun.findById(req.params.id);
	if (!payrun) throw new ApiError(404, "Payrun not found");
	if (!['validated', 'paid'].includes(payrun.status)) throw new ApiError(400, "Validate the payrun before sending payslips");
	const payslips = await Payslip.find({ payrun: payrun._id }).populate("employee", "name email").populate("contract", "code wageMonthly");
	const sent = [];
	const failed = [];
	for (let index = 0; index < payslips.length; index += 5) {
		const results = await Promise.allSettled(payslips.slice(index, index + 5).map(async (payslip) => {
			if (!payslip.employee?.email) throw new Error(`${payslip.employee?.name || "Employee"} has no email address`);
			const pdfBuffer = await generatePayslipPdfBuffer({
				employee: payslip.employee,
				period: payslip.period,
				contractWage: payslip.contract?.wageMonthly,
				lines: payslip.lines,
				grossSalary: payslip.grossSalary,
				totalDeductions: payslip.totalDeductions,
				netSalary: payslip.netSalary,
				workedDays: payslip.workedDays,
				expectedWorkingDays: payslip.expectedWorkingDays,
				payrunName: payrun.name,
				contractCode: payslip.contract?.code,
			});
			await sendPayslipEmail({ employeeName: payslip.employee.name, employeeEmail: payslip.employee.email, period: payslip.period, pdfBuffer });
			payslip.emailSentAt = new Date();
			await payslip.save();
			return { id: payslip._id, employee: payslip.employee.name };
		}));
		for (const result of results) {
			if (result.status === "fulfilled") sent.push(result.value);
			else failed.push({ message: result.reason?.message || "Failed to send payslip" });
		}
	}
	return res.status(200).json(new ApiResponse(200, { sent, failed }, "Payslip email batch completed"));
});

export { listPayruns, getPayrunById, createDraftPayrun, setEmployeesOnPayrun, computePayrun, validatePayrun, markPaidPayrun, deletePayrun, sendPayslips };
