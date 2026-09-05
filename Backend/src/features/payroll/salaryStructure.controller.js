import mongoose from "mongoose";
import { SalaryStructure } from "./salaryStructure.model.js";
import { SalaryRule } from "./salaryRule.model.js";
import { Payrun } from "./payrun.model.js";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";

const validateObjectId = (id, label = "id") => {
	if (!mongoose.isValidObjectId(id)) {
		throw new ApiError(400, `Invalid ${label} id`);
	}
};

const listSalaryStructures = asyncHandler(async (req, res) => {
	const structures = await SalaryStructure.aggregate([
		{ $lookup: { from: "salaryrules", localField: "_id", foreignField: "salaryStructure", as: "rules" } },
		{ $addFields: { ruleCount: { $size: "$rules" } } },
		{ $project: { rules: 0 } },
		{ $sort: { createdAt: -1 } },
	]);
	return res.status(200).json(new ApiResponse(200, structures));
});

const createSalaryStructure = asyncHandler(async (req, res) => {
	const { name, description, isActive } = req.body || {};
	if (!name || !String(name).trim()) {
		throw new ApiError(400, "name is required");
	}
	const created = await SalaryStructure.create({ name, description: description || "", isActive: isActive !== false });
	return res.status(201).json(new ApiResponse(201, created, "Salary structure created"));
});

const updateSalaryStructure = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "salaryStructure");
	const structure = await SalaryStructure.findById(req.params.id);
	if (!structure) throw new ApiError(404, "Salary structure not found");
	const { name, description, isActive } = req.body || {};
	if (typeof name !== "undefined" && (!name || !String(name).trim())) {
		throw new ApiError(400, "name is required");
	}
	if (typeof name !== "undefined") structure.name = name;
	if (typeof description !== "undefined") structure.description = description || "";
	if (typeof isActive !== "undefined") structure.isActive = Boolean(isActive);
	await structure.save();
	return res.status(200).json(new ApiResponse(200, structure, "Salary structure updated"));
});

const deleteSalaryStructure = asyncHandler(async (req, res) => {
	validateObjectId(req.params.id, "salaryStructure");
	const structure = await SalaryStructure.findById(req.params.id);
	if (!structure) throw new ApiError(404, "Salary structure not found");
	const [ruleExists, payrunExists] = await Promise.all([
		SalaryRule.exists({ salaryStructure: structure._id }),
		Payrun.exists({ salaryStructure: structure._id }),
	]);
	if (ruleExists || payrunExists) throw new ApiError(409, "This salary structure is in use and cannot be deleted");
	await structure.deleteOne();
	return res.status(200).json(new ApiResponse(200, null, "Salary structure deleted"));
});

export {
	listSalaryStructures,
	createSalaryStructure,
	updateSalaryStructure,
	deleteSalaryStructure,
};
