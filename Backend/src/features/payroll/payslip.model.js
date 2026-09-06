import mongoose from "mongoose";

const payslipLineSchema = new mongoose.Schema({
	code: { type: String, required: true, trim: true },
	name: { type: String, required: true, trim: true },
	category: { type: String, required: true, trim: true },
	amount: { type: Number, required: true, default: 0 },
}, { _id: false });

const payslipPeriodSchema = new mongoose.Schema({
	startDate: { type: Date, required: true },
	endDate: { type: Date, required: true },
}, { _id: false });

const payslipSchema = new mongoose.Schema({
	payrun: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Payrun",
		required: true,
		index: true,
	},
	employee: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Employee",
		required: true,
		index: true,
	},
	contract: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Contract",
		required: true,
	},
	period: { type: payslipPeriodSchema, required: true },
	lines: [payslipLineSchema],
	workedDays: { type: Number, default: 0, min: 0 },
	expectedWorkingDays: { type: Number, default: null, min: 0 },
	paidLeaveDays: { type: Number, default: 0, min: 0 },
	unpaidLeaveDays: { type: Number, default: 0, min: 0 },
	scheduleApplied: { type: Boolean, default: true },
	warning: { type: String, enum: ["A/C missing", "Duplicate", null], default: null },
	basicSalary: { type: Number, default: 0 },
	grossSalary: { type: Number, default: 0 },
	totalDeductions: { type: Number, default: 0 },
	netSalary: { type: Number, default: 0 },
	status: {
		type: String,
		enum: ["draft", "computed", "validated", "paid"],
		default: "draft",
	},
	pdfGeneratedAt: { type: Date, default: null },
	emailSentAt: { type: Date, default: null },
}, { timestamps: true });

payslipSchema.index({ employee: 1, payrun: 1 }, { unique: true });

export const Payslip = mongoose.model("Payslip", payslipSchema);
