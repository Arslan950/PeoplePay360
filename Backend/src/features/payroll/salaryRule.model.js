import mongoose from "mongoose";

const salaryRuleSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	code: {
		type: String,
		required: true,
		trim: true,
		uppercase: true,
		unique: true,
	},
	category: {
		type: String,
		enum: ["basic", "allowance", "deduction", "gross", "net"],
		required: true,
	},
	salaryStructure: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "SalaryStructure",
		required: true,
		index: true,
	},
	sequence: { type: Number, required: true },
	computationType: {
		type: String,
		enum: ["fixed", "percentage", "formula"],
		required: true,
	},
	fixedAmount: { type: Number, default: 0 },
	percentageBase: {
		type: String,
		enum: ["contract_wage", "basic_salary", "gross_salary"],
		default: null,
	},
	percentageValue: { type: Number, default: 0 },
	formulaExpression: { type: String, default: "" },
	isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const SalaryRule = mongoose.model("SalaryRule", salaryRuleSchema);
