import mongoose from "mongoose";
import { ApiError } from "../../utils/api-error.js";

const salaryStructureRuleSchema = new mongoose.Schema({
	rule: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryRule", required: true },
	sequence: { type: Number, required: true, min: 0 },
}, { _id: false });

const salaryStructureSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	description: { type: String, default: "" },
	rules: [salaryStructureRuleSchema],
	isActive: { type: Boolean, default: true },
}, { timestamps: true });

salaryStructureSchema.pre("validate", async function validateStructure(next) {
	try {
		const ruleIds = (this.rules || []).map((entry) => entry.rule).filter(Boolean);
		if (!ruleIds.length) {
			next();
			return;
		}
		const hydratedRuleDocs = await mongoose.model("SalaryRule").find({ _id: { $in: ruleIds } }).lean();
		const ruleMap = new Map(hydratedRuleDocs.map((rule) => [rule.code, rule]));
		const ordered = [...(this.rules || [])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
		for (const entry of ordered) {
			const ruleDoc = hydratedRuleDocs.find((doc) => doc._id.toString() === entry.rule.toString());
			if (!ruleDoc) continue;
			if (ruleDoc.computationType === "percentage") {
				const refCode = String(ruleDoc.percentageOf || "").trim().toUpperCase();
				if (!refCode) {
					next(new ApiError(400, `Rule ${ruleDoc.code} is missing a percentageOf target`));
					return;
				}
				const refRule = ordered.find((candidate) => {
					const candidateDoc = hydratedRuleDocs.find((doc) => doc._id.toString() === candidate.rule.toString());
					return candidateDoc && candidateDoc.code === refCode;
				});
				if (!refRule) {
					next(new ApiError(400, `Rule ${ruleDoc.code} references unknown code ${refCode}`));
					return;
				}
				if ((refRule.sequence ?? 0) > (entry.sequence ?? 0)) {
					next(new ApiError(400, `Rule ${ruleDoc.code} references ${refCode} but that code is scheduled later in the sequence`));
					return;
				}
			}
		}
		next();
	} catch (error) {
		next(error instanceof ApiError ? error : new ApiError(400, error.message || "Invalid salary structure"));
	}
});

export const SalaryStructure = mongoose.model("SalaryStructure", salaryStructureSchema);
