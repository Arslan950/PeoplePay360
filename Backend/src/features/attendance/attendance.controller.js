import mongoose from "mongoose";
import { Attendance } from "./attendance.model.js";
import { Employee } from "../employees/employee.model.js";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";

const validateId = (id, label = "attendance") => {
	if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label} id`);
};

const ensureActiveEmployee = async (employeeId) => {
	validateId(employeeId, "employee");
	const employee = await Employee.findOne({ _id: employeeId, status: "active" });
	if (!employee) throw new ApiError(404, "Active employee not found");
	return employee;
};

const getAttendance = asyncHandler(async (req, res) => {
	const filter = {};
	if (req.query.employee) {
		validateId(req.query.employee, "employee");
		filter.employee = req.query.employee;
	}

	const records = await Attendance.find(filter)
		.populate("employee", "name email department jobPosition")
		.sort({ checkIn: -1 });
	return res.status(200).json(new ApiResponse(200, records));
});

const checkIn = asyncHandler(async (req, res) => {
	const { employee, source, notes } = req.body;
	await ensureActiveEmployee(employee);

	const openRecord = await Attendance.findOne({ employee, checkOut: null });
	if (openRecord) throw new ApiError(409, "Employee is already checked in");

	try {
		const record = await Attendance.create({ employee, source, notes });
		return res.status(201).json(new ApiResponse(201, record, "Employee checked in"));
	} catch (error) {
		if (error?.code === 11000) throw new ApiError(409, "Employee is already checked in");
		throw error;
	}
});

const checkOut = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const record = await Attendance.findOne({ _id: req.params.id, checkOut: null });
	if (!record) throw new ApiError(404, "Open attendance record not found");

	record.checkOut = new Date();
	record.durationMinutes = Math.max(0, Math.round((record.checkOut - record.checkIn) / 60000));
	await record.save();
	return res.status(200).json(new ApiResponse(200, record, "Employee checked out"));
});

const correctAttendance = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const allowedFields = ["checkIn", "checkOut", "notes"];
	const changes = Object.fromEntries(
		allowedFields
			.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field))
			.map((field) => [field, req.body[field]])
	);
	if (!Object.keys(changes).length) throw new ApiError(400, "No attendance fields supplied");

	const record = await Attendance.findById(req.params.id);
	if (!record) throw new ApiError(404, "Attendance record not found");
	Object.assign(record, changes);
	if (record.checkOut && record.checkOut < record.checkIn) {
		throw new ApiError(400, "checkOut must be after checkIn");
	}
	record.durationMinutes = record.checkOut
		? Math.max(0, Math.round((record.checkOut - record.checkIn) / 60000))
		: null;
	await record.save();
	return res.status(200).json(new ApiResponse(200, record, "Attendance corrected"));
});

export { getAttendance, checkIn, checkOut, correctAttendance };
