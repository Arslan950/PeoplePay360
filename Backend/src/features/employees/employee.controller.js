import mongoose from "mongoose";
import { Employee } from "./employee.model.js";
import "../schedules/schedule.model.js";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";

const employeeFields = ["name", "email", "phone", "department", "jobPosition", "manager", "workingSchedule", "employeeType", "status", "joinDate"];

const pickEmployeeFields = (body) => Object.fromEntries(
	employeeFields
		.filter((field) => Object.prototype.hasOwnProperty.call(body, field))
		.map((field) => [field, body[field]])
);

const validateId = (id) => {
	if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid employee id");
};

const handleDuplicate = (error) => {
	if (error?.code === 11000) throw new ApiError(409, "An employee with that email already exists");
	throw error;
};

const getEmployees = asyncHandler(async (req, res) => {
	const filters = {};
	for (const field of ["department", "status", "employeeType"]) {
		if (req.query[field]) filters[field] = req.query[field];
	}

	const employees = await Employee.find(filters)
		.populate("manager", "name email jobPosition")
		.populate("workingSchedule")
		.populate("user", "email role isActive");

	return res.status(200).json(new ApiResponse(200, employees));
});

const getEmployeeById = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const employee = await Employee.findById(req.params.id)
		.populate("manager", "name email jobPosition")
		.populate("workingSchedule")
		.populate("user", "email role isActive");

	if (!employee) throw new ApiError(404, "Employee not found");
	return res.status(200).json(new ApiResponse(200, employee));
});

const createEmployee = asyncHandler(async (req, res) => {
	const data = pickEmployeeFields(req.body);
	if (!data.name || !data.email) throw new ApiError(400, "name and email are required");

	try {
		const employee = await Employee.create(data);
		return res.status(201).json(new ApiResponse(201, employee, "Employee created"));
	} catch (error) {
		handleDuplicate(error);
	}
});

const updateEmployee = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const data = pickEmployeeFields(req.body);
	if (!Object.keys(data).length) throw new ApiError(400, "No employee fields supplied");

	try {
		const employee = await Employee.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
			.populate("manager", "name email jobPosition")
			.populate("workingSchedule")
			.populate("user", "email role isActive");
		if (!employee) throw new ApiError(404, "Employee not found");
		return res.status(200).json(new ApiResponse(200, employee, "Employee updated"));
	} catch (error) {
		handleDuplicate(error);
	}
});

const deactivateEmployee = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const employee = await Employee.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true, runValidators: true });
	if (!employee) throw new ApiError(404, "Employee not found");
	return res.status(200).json(new ApiResponse(200, employee, "Employee deactivated"));
});

const reactivateEmployee = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const employee = await Employee.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true, runValidators: true });
	if (!employee) throw new ApiError(404, "Employee not found");
	return res.status(200).json(new ApiResponse(200, employee, "Employee reactivated"));
});

export { getEmployees, getEmployeeById, createEmployee, updateEmployee, deactivateEmployee, reactivateEmployee };
