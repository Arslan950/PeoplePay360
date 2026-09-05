import mongoose from "mongoose";

const salaryStructureSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	description: { type: String, default: "", trim: true },
	mathematicalFormula: {
		type: String,
		required: true,
		trim: true,
		default: "BASIC = contractWage; GROSS = BASIC; DEDUCTIONS = 0; NET = GROSS - DEDUCTIONS",
	},
}, { timestamps: true });

export const SalaryStructure = mongoose.model("SalaryStructure", salaryStructureSchema);
