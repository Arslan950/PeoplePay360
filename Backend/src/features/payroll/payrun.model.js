import mongoose from "mongoose";

const payrunPeriodSchema = new mongoose.Schema({
	startDate: { type: Date, required: true },
	endDate: { type: Date, required: true },
}, { _id: false });

const payrunSchema = new mongoose.Schema({
	code: { type: String, unique: true, trim: true },
	name: { type: String, required: true, trim: true },
	salaryStructure: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "SalaryStructure",
		required: true,
		index: true,
	},
	period: { type: payrunPeriodSchema, required: true },
	employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
	status: {
		type: String,
		enum: ["draft", "computed", "validated", "paid"],
		default: "draft",
	},
	warnings: [{ type: String }],
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		default: null,
	},
}, { timestamps: true });

export const Payrun = mongoose.model("Payrun", payrunSchema);
