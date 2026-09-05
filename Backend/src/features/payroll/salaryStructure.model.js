import mongoose from "mongoose";

const salaryStructureSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	description: { type: String, default: "", trim: true },
	isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const SalaryStructure = mongoose.model("SalaryStructure", salaryStructureSchema);
