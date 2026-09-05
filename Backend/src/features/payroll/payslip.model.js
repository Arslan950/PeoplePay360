import mongoose from "mongoose";

const payslipLineSchema = new mongoose.Schema({
	code: { type: String, required: true, trim: true },
	name: { type: String, required: true, trim: true },
	category: { type: String, required: true, trim: true },
	amount: { type: Number, required: true, default: 0 },
}, { _id: false });

const payslipSchema = new mongoose.Schema({
	payrun: { type: mongoose.Schema.Types.ObjectId, ref: "Payrun", required: true, index: true },
	employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
	contract: { type: mongoose.Schema.Types.ObjectId, ref: "Contract", required: true },
	period: {
		startDate: { type: Date, required: true },
		endDate: { type: Date, required: true },
	},
	workedDays: { type: Number, default: 0 },
	lines: [payslipLineSchema],
	grossSalary: { type: Number, default: 0 },
	totalDeductions: { type: Number, default: 0 },
	netSalary: { type: Number, default: 0 },
	status: { type: String, enum: ["draft", "computed", "validated", "paid"], default: "draft" },
	paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
	pdfGeneratedAt: { type: Date, default: null },
	emailSentAt: { type: Date, default: null },
}, { timestamps: true });

payslipSchema.index({ employee: 1, "period.startDate": 1, "period.endDate": 1 }, { unique: true });

export const Payslip = mongoose.model("Payslip", payslipSchema);
