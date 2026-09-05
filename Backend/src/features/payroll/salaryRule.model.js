import mongoose from "mongoose";

const salaryRuleSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	code: { type: String, required: true, trim: true, unique: true, uppercase: true },
	category: { type: String, enum: ["basic", "allowance", "gross", "deduction", "net"], required: true },
	sequence: { type: Number, required: true, min: 0 },
	computationType: { type: String, enum: ["fixed", "percentage", "formula"], required: true },
	fixedAmount: { type: Number, default: 0 },
	percentageOf: { type: String, trim: true, default: "" },
	percentageValue: { type: Number, default: 0 },
	formulaExpression: { type: String, trim: true, default: "" },
	isActive: { type: Boolean, default: true },
}, { timestamps: true });

salaryRuleSchema.pre("validate", function normalize(next) {
	if (this.code) this.code = String(this.code).trim().toUpperCase();
	next();
});

export const SalaryRule = mongoose.model("SalaryRule", salaryRuleSchema);
