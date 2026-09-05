import mongoose from "mongoose";
import { SalaryRule } from "./salaryRule.model.js";
import { SalaryStructure } from "./salaryStructure.model.js";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";

const validateObjectId = (id, label = "id") => {
	if (!mongoose.isValidObjectId(id)) {
		throw new ApiError(400, `Invalid ${label} id`);
	}
};

const validateRulePayload = async (fields, currentRule = null) => {
	const computationType = fields.computationType ?? currentRule?.computationType;
	const salaryStructure = fields.salaryStructure ?? currentRule?.salaryStructure;
	const sequence = Number(fields.sequence ?? currentRule?.sequence);
	if (!salaryStructure) throw new ApiError(400, "salaryStructure is required");
	validateObjectId(salaryStructure, "salaryStructure");
	if (!Number.isFinite(sequence)) throw new ApiError(400, "sequence is required");
	const structure = await SalaryStructure.findById(salaryStructure);
	if (!structure) throw new ApiError(404, "Salary structure not found");

	if (computationType === "fixed" && !Number.isFinite(Number(fields.fixedAmount ?? currentRule?.fixedAmount))) {
		throw new ApiError(400, "fixedAmount is required for fixed rules");
	}
	if (computationType === "percentage") {
		const base = fields.percentageBase ?? currentRule?.percentageBase;
		const value = fields.percentageValue ?? currentRule?.percentageValue;
		if (!base || !Number.isFinite(Number(value))) throw new ApiError(400, "percentageBase and percentageValue are required for percentage rules");
		const dependencyCode = base === "basic_salary" ? "BASIC" : base === "gross_salary" ? "GROSS" : null;
		if (dependencyCode) {
			const dependency = await SalaryRule.findOne({
				salaryStructure,
				code: dependencyCode,
				sequence: { $lt: sequence },
				isActive: true,
				_id: { $ne: currentRule?._id },
			});
			if (!dependency) throw new ApiError(400, `${dependencyCode} must be active and have a lower sequence before this rule`);
		}
	}
	const formulaExpression = fields.formulaExpression ?? currentRule?.formulaExpression ?? "";
	if (computationType === "formula" && !String(formulaExpression).trim()) {
		throw new ApiError(400, "formulaExpression is required for formula rules");
	}
};

const listSalaryRules = asyncHandler(async (req, res) => {
	const rules = await SalaryRule.find().populate("salaryStructure", "name").sort({ sequence: 1, createdAt: -1 });
	return res.status(200).json(new ApiResponse(200, rules));
});

const createSalaryRule = asyncHandler(async (req, res) => {
	const fields = req.body || {};
	if (!fields.name || !String(fields.name).trim()) {
		throw new ApiError(400, "name is required");
	}
	if (!fields.code || !String(fields.code).trim()) {
		throw new ApiError(400, "code is required");
	}
	if (!fields.salaryStructure) {
		throw new ApiError(400, "salaryStructure is required");
	}
	await validateRulePayload(fields);

	const created = await SalaryRule.create({
		...fields,
		code: String(fields.code).toUpperCase(),
		isActive: fields.isActive !== false,
	});
	return res.status(201).json(new ApiResponse(201, created, "Salary rule created"));
});

const updateSalaryRule = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "salaryRule");
	const rule = await SalaryRule.findById(req.params.id);
	if (!rule) throw new ApiError(404, "Salary rule not found");
	const fields = req.body || {};
	if (typeof fields.name !== "undefined" && (!fields.name || !String(fields.name).trim())) {
		throw new ApiError(400, "name is required");
	}
	if (typeof fields.code !== "undefined" && (!fields.code || !String(fields.code).trim())) {
		throw new ApiError(400, "code is required");
	}
	await validateRulePayload(fields, rule);
	Object.assign(rule, fields, fields.code ? { code: String(fields.code).toUpperCase() } : {});
	await rule.save();
	return res.status(200).json(new ApiResponse(200, rule, "Salary rule updated"));
});

const deleteSalaryRule = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "salaryRule");
	const rule = await SalaryRule.findById(req.params.id);
	if (!rule) throw new ApiError(404, "Salary rule not found");
	await rule.deleteOne();
	return res.status(200).json(new ApiResponse(200, null, "Salary rule deleted"));
});

export {
	listSalaryRules,
	createSalaryRule,
	updateSalaryRule,
	deleteSalaryRule,
};
