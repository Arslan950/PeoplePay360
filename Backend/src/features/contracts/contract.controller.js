import mongoose from "mongoose";
import { Employee } from "../employees/employee.model.js";
import { Contract } from "./contract.model.js";
import { assertNoOverlap, nextContractNumber, resolveStatus } from "./contract.service.js";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";

const validateId = (id, label = "contract") => {
	if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label} id`);
};

const contractFields = [
	"employee",
	"department",
	"jobPosition",
	"startDate",
	"endDate",
	"wageMonthly",
	"workingSchedule",
	"salaryStructure",
	"status",
	"notes",
];

const pickContractFields = (body) => Object.fromEntries(
	contractFields
		.filter((field) => Object.prototype.hasOwnProperty.call(body, field))
		.map((field) => [field, body[field]])
);

const attachComputedStatus = (record) => {
	const plain = record.toObject ? record.toObject() : { ...record };
	plain.status = resolveStatus(plain);
	return plain;
};

const getContracts = asyncHandler(async (req, res) => {
	const filter = {};
	if (req.user.role === "employee") {
		if (!req.user.employee) return res.status(200).json(new ApiResponse(200, []));
		filter.employee = req.user.employee;
	} else if (req.query.employee) {
		validateId(req.query.employee, "employee");
		filter.employee = req.query.employee;
	}

	if (req.query.status) {
		const allowed = ["running", "expired", "draft"];
		if (!allowed.includes(req.query.status)) throw new ApiError(400, "Invalid status filter");
	}

	const contracts = await Contract.find(filter)
		.populate("employee", "name department jobPosition")
		.populate("workingSchedule", "name")
		.sort({ startDate: -1 });

	const records = contracts.map(attachComputedStatus).filter((record) => !req.query.status || record.status === req.query.status);
	return res.status(200).json(new ApiResponse(200, records));
});

const getContractById = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	if (req.user.role === "employee") {
		if (!req.user.employee) return res.status(404).json(new ApiResponse(404, null, "Contract not found"));
	}
	const contract = await Contract.findById(req.params.id)
		.populate("employee", "name department jobPosition")
		.populate("workingSchedule", "name");
	if (!contract) throw new ApiError(404, "Contract not found");
	if (req.user.role === "employee" && contract.employee?._id?.toString() !== req.user.employee?.toString()) {
		throw new ApiError(403, "You can only view your own contracts");
	}
	return res.status(200).json(new ApiResponse(200, attachComputedStatus(contract)));
});

const createContract = asyncHandler(async (req, res) => {
	const data = pickContractFields(req.body || {});
	if (!data.employee || !data.startDate || data.wageMonthly === undefined) {
		throw new ApiError(400, "employee, startDate, and wageMonthly are required");
	}

	const employee = await Employee.findById(data.employee);
	if (!employee) throw new ApiError(404, "Employee not found");
	if (!data.department) data.department = employee.department || "";
	if (!data.jobPosition) data.jobPosition = employee.jobPosition || "";

	const startDate = new Date(data.startDate);
	if (Number.isNaN(startDate.getTime())) throw new ApiError(400, "Invalid startDate");
	const endDate = data.endDate ? new Date(data.endDate) : null;
	if (endDate && Number.isNaN(endDate.getTime())) throw new ApiError(400, "Invalid endDate");
	if (endDate && endDate < startDate) throw new ApiError(400, "endDate must be after startDate");

	await assertNoOverlap({
		employee: data.employee,
		startDate,
		endDate,
		status: data.status || "draft",
	});

	data.code = await nextContractNumber(startDate.getFullYear());
	const contract = await Contract.create(data);
	const created = await Contract.findById(contract._id)
		.populate("employee", "name department jobPosition")
		.populate("workingSchedule", "name");
	return res.status(201).json(new ApiResponse(201, attachComputedStatus(created), "Contract created"));
});

const updateContract = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const data = pickContractFields(req.body || {});
	const keys = Object.keys(data).filter((key) => !["employee", "startDate"].includes(key));
	if (!keys.length) throw new ApiError(400, "No contract fields supplied");

	const contract = await Contract.findById(req.params.id);
	if (!contract) throw new ApiError(404, "Contract not found");

	if (Object.prototype.hasOwnProperty.call(data, "endDate") || Object.prototype.hasOwnProperty.call(data, "status")) {
		const nextEndDate = Object.prototype.hasOwnProperty.call(data, "endDate") ? (data.endDate ? new Date(data.endDate) : null) : contract.endDate;
		if (nextEndDate && Number.isNaN(nextEndDate.getTime())) throw new ApiError(400, "Invalid endDate");
		if (nextEndDate && nextEndDate < new Date(contract.startDate)) {
			throw new ApiError(400, "endDate must be after startDate");
		}
		await assertNoOverlap({
			employee: contract.employee,
			startDate: contract.startDate,
			endDate: nextEndDate,
			excludeContractId: contract._id,
			status: data.status || contract.status,
		});
	}

	Object.assign(contract, data);
	await contract.save();
	const updated = await Contract.findById(contract._id)
		.populate("employee", "name department jobPosition")
		.populate("workingSchedule", "name");
	return res.status(200).json(new ApiResponse(200, attachComputedStatus(updated), "Contract updated"));
});

export { getContracts, getContractById, createContract, updateContract };

