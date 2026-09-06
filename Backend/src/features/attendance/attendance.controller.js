import mongoose from "mongoose";
import { Attendance } from "./attendance.model.js";
import { Employee } from "../employees/employee.model.js";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";

const validateId = (id, label = "attendance") => {
	if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label} id`);
};

const timeToMinutes = (value) => {
	if (typeof value !== "string") return Number.NaN;
	const match = value.match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return Number.NaN;
	return (Number(match[1]) * 60) + Number(match[2]);
};

const getLocalDateString = (value) => {
	const date = new Date(value);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const attachComputedFields = (record) => {
	const data = typeof record.toObject === "function" ? record.toObject() : record;
	const durationMinutes = data.durationMinutes;
	const workedHours = durationMinutes == null ? null : durationMinutes / 60;

	const weekday = new Date(data.checkIn).toLocaleDateString("en-US", { weekday: "long" });
	const shortWeekday = weekday.slice(0, 3);
	const weeklyPattern = data.employee?.workingSchedule?.weeklyPattern;
	const entry = Array.isArray(weeklyPattern)
		? weeklyPattern.find((item) => (item?.day === weekday || item?.day === shortWeekday) && item.isWorkingDay)
		: null;
	if (!entry) return { ...data, workedHours, overtime: null, scheduleApplied: false };

	const startMinutes = timeToMinutes(entry?.startTime);
	const endMinutes = timeToMinutes(entry?.endTime);
	const breakMinutes = Number(entry?.breakMinutes);
	if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || !Number.isFinite(breakMinutes)
		|| endMinutes - startMinutes - breakMinutes <= 0) {
		return { ...data, workedHours, overtime: null, scheduleApplied: false };
	}

	const scheduleContext = {
		scheduleName: data.employee?.workingSchedule?.name || null,
		scheduleApplied: true,
	};
	if (durationMinutes == null) return { ...data, workedHours, overtime: null, ...scheduleContext };

	const expectedHours = (endMinutes - startMinutes - breakMinutes) / 60;

	return { ...data, workedHours, overtime: Number(Math.max(0, workedHours - expectedHours).toFixed(2)), ...scheduleContext };
};

const ensureActiveEmployee = async (employeeId) => {
	validateId(employeeId, "employee");
	const employee = await Employee.findOne({ _id: employeeId, status: "active" });
	if (!employee) throw new ApiError(404, "Active employee not found");
	return employee;
};

const getAttendance = asyncHandler(async (req, res) => {
	const filter = {};

	if (req.user.role === "employee") {
		if (!req.user.employee) return res.status(200).json(new ApiResponse(200, []));
		filter.employee = req.user.employee;
	} else if (req.query.employee) {
		validateId(req.query.employee, "employee");
		filter.employee = req.query.employee;
	}

	if (req.query.from || req.query.to) {
		filter.checkIn = {};
		if (req.query.from) {
			const from = new Date(req.query.from);
			if (Number.isNaN(from.getTime())) throw new ApiError(400, "Invalid from date");
			filter.checkIn.$gte = from;
		}
		if (req.query.to) {
			const to = new Date(req.query.to);
			if (Number.isNaN(to.getTime())) throw new ApiError(400, "Invalid to date");
			filter.checkIn.$lte = to;
		}
	}

	const records = await Attendance.find(filter)
		.populate({
			path: "employee",
			select: "name email department jobPosition manager workingSchedule",
			populate: { path: "workingSchedule", select: "name weeklyPattern weeklyHours" },
		})
		.sort({ checkIn: -1 });
	return res.status(200).json(new ApiResponse(200, records.map(attachComputedFields)));
});

const getAttendanceById = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const record = await Attendance.findById(req.params.id).populate({
		path: "employee",
		select: "name email department jobPosition manager workingSchedule",
		populate: [
			{ path: "manager", select: "name" },
			{ path: "workingSchedule", select: "name weeklyPattern weeklyHours" },
		],
	});
	if (!record) throw new ApiError(404, "Attendance record not found");
	if (req.user.role === "employee" && (!req.user.employee || record.employee._id.toString() !== req.user.employee.toString())) {
		throw new ApiError(403, "You can only view your own attendance");
	}
	return res.status(200).json(new ApiResponse(200, attachComputedFields(record)));
});

const checkIn = asyncHandler(async (req, res) => {
	const { employee, source, notes } = req.body || {};
	const targetEmployee = req.user.role === "employee" ? req.user.employee : employee;

	if (req.user.role === "employee") {
		if (!req.user.employee) throw new ApiError(403, "No employee record linked to this account");
	} else if (!targetEmployee) {
		throw new ApiError(400, "employee is required");
	}

	await ensureActiveEmployee(targetEmployee);

	const checkInAt = new Date();
	const today = getLocalDateString(checkInAt);
	const existingRecord = await Attendance.findOne({ employee: targetEmployee, date: today });
	if (existingRecord) {
		if (!existingRecord.checkOut) throw new ApiError(409, "Employee is already checked in");
		throw new ApiError(409, "Attendance for today has already been recorded. Ask an HR Manager to correct it if this is wrong.");
	}

	try {
		const record = await Attendance.create({ employee: targetEmployee, checkIn: checkInAt, source, notes });
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

	if (req.user.role === "employee") {
		if (!req.user.employee || record.employee.toString() !== req.user.employee.toString()) {
			throw new ApiError(403, "You can only check yourself out");
		}
	}

	record.checkOut = new Date();
	record.status = "closed";
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
	record.status = record.checkOut ? "closed" : "open";
	record.wasCorrected = true;
	await record.save();
	return res.status(200).json(new ApiResponse(200, record, "Attendance corrected"));
});

export { attachComputedFields, getAttendance, getAttendanceById, checkIn, checkOut, correctAttendance };
