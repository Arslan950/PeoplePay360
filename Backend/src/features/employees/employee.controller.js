import mongoose from "mongoose";
import { Employee } from "./employee.model.js";
import { User } from "../users/user.model.js";
import { generateTempPassword, hashPassword } from "../users/user.service.js";
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
	if (error?.code === 11000) throw new ApiError(409, "An employee account with that email already exists");
	throw error;
};

const getInitialPassword = (email) => {
	if (typeof email !== "string") throw new ApiError(400, "A valid email address is required");
	const normalizedEmail = email.toLowerCase().trim();
	const localPart = normalizedEmail.split("@", 1)[0];
	if (!localPart || !/^[^\s@]+@[^\s@]+$/.test(normalizedEmail)) {
		throw new ApiError(400, "A valid email address is required");
	}

	return { normalizedEmail, password: `${localPart}1234` };
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

	const { normalizedEmail, password } = getInitialPassword(data.email);
	data.email = normalizedEmail;

	try {
		const [existingEmployee, existingUser] = await Promise.all([
			Employee.exists({ email: normalizedEmail }),
			User.exists({ email: normalizedEmail }),
		]);
		if (existingEmployee || existingUser) {
			throw new ApiError(409, "An employee account with that email already exists");
		}

		const employee = new Employee(data);
		const user = new User({
			email: normalizedEmail,
			role: "employee",
			employee: employee._id,
			passwordHash: await hashPassword(password),
		});

		employee.user = user._id;

		try {
			await user.save();
			await employee.save();
		} catch (error) {
			// Do not leave an account behind if its employee record cannot be created.
			if (!user.isNew) await User.deleteOne({ _id: user._id });
			throw error;
		}

		const createdEmployee = await Employee.findById(employee._id)
			.populate("manager", "name email jobPosition")
			.populate("workingSchedule")
			.populate("user", "email role isActive");
		return res.status(201).json(new ApiResponse(
			201,
			{ employee: createdEmployee, temporaryPassword: password },
			"Employee created; share the temporary password securely",
		));
	} catch (error) {
		handleDuplicate(error);
	}
});

const resetEmployeeCredentials = asyncHandler(async (req, res) => {
	validateId(req.params.id);

	const employee = await Employee.findById(req.params.id).populate("user", "email");
	if (!employee) throw new ApiError(404, "Employee not found");
	if (!employee.user) throw new ApiError(404, "This employee has no login account");

	const temporaryPassword = generateTempPassword();
	const user = await User.findByIdAndUpdate(employee.user._id, {
		passwordHash: await hashPassword(temporaryPassword),
		isActive: true,
	});
	if (!user) throw new ApiError(404, "Employee login account not found");

	return res.status(200).json(new ApiResponse(
		200,
		{ email: employee.user.email, temporaryPassword },
		"Temporary credentials generated; share them securely",
	));
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

export {
	getEmployees,
	getEmployeeById,
	createEmployee,
	resetEmployeeCredentials,
	updateEmployee,
	deactivateEmployee,
	reactivateEmployee,
};
