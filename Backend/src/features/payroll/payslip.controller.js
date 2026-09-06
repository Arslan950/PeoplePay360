import mongoose from "mongoose";
import { Payslip } from "./payslip.model.js";
import { generatePayslipPdfBuffer } from "./pdf.service.js";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";

const validateObjectId = (id, label = "id") => {
	if (!mongoose.isValidObjectId(id)) {
		throw new ApiError(400, `Invalid ${label} id`);
	}
};

const getPayslips = asyncHandler(async (req, res) => {
	const filter = {};
	if (req.user.role === "employee" && req.user.employee) {
		filter.employee = req.user.employee;
	}
	const payslips = await Payslip.find(filter)
		.populate("employee", "name department email")
		.populate({ path: "payrun", select: "name status salaryStructure period", populate: { path: "salaryStructure", select: "name" } })
		.sort({ createdAt: -1 });
	return res.status(200).json(new ApiResponse(200, payslips));
});

const getPayslipById = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "payslip");
	const payslip = await Payslip.findById(req.params.id)
		.populate("employee", "name department email")
		.populate("payrun", "name status salaryStructure period")
		.populate("contract", "code wageMonthly");
	if (!payslip) throw new ApiError(404, "Payslip not found");
	if (req.user.role === "employee" && req.user.employee?.toString() !== payslip.employee?._id?.toString()) {
		throw new ApiError(403, "You can only view your own payslips");
	}
	return res.status(200).json(new ApiResponse(200, payslip));
});

const getPayslipPdf = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "payslip");
	const payslip = await Payslip.findById(req.params.id)
		.populate("employee", "name email")
		.populate("contract", "code wageMonthly")
		.populate("payrun", "name");
	if (!payslip) throw new ApiError(404, "Payslip not found");
	if (req.user.role === "employee" && req.user.employee?.toString() !== payslip.employee?._id?.toString()) {
		throw new ApiError(403, "You can only access your own payslip PDF");
	}

	const pdfBuffer = await generatePayslipPdfBuffer({
		employee: payslip.employee,
		period: payslip.period,
		contractWage: payslip.contract?.wageMonthly || 0,
		lines: payslip.lines,
		grossSalary: payslip.grossSalary,
		totalDeductions: payslip.totalDeductions,
		netSalary: payslip.netSalary,
		workedDays: payslip.workedDays,
		expectedWorkingDays: payslip.expectedWorkingDays,
		payrunName: payslip.payrun?.name,
		contractCode: payslip.contract?.code,
	});
	payslip.pdfGeneratedAt = new Date();
	await payslip.save();

	res.setHeader("Content-Type", "application/pdf");
	res.setHeader("Content-Disposition", `attachment; filename="payslip-${payslip._id}.pdf"`);
	res.send(pdfBuffer);
});

export { getPayslips, getPayslipById, getPayslipPdf };
