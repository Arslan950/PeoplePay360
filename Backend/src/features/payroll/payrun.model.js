import mongoose from "mongoose";

const payrunSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	period: {
		startDate: { type: Date, required: true },
		endDate: { type: Date, required: true },
	},
	salaryStructure: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryStructure", required: true },
	employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
	status: { type: String, enum: ["draft", "computed", "validated", "paid"], default: "draft" },
	warnings: [{ type: String, trim: true }],
	createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

payrunSchema.index({ "period.startDate": 1, "period.endDate": 1 });

export const Payrun = mongoose.model("Payrun", payrunSchema);
