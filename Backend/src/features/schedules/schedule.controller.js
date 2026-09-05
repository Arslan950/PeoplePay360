import mongoose from "mongoose";
import { WorkingSchedule } from "./schedule.model.js";
import { computeWeeklyHours } from "./schedule.utils.js";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";

const scheduleFields = ["name", "weeklyPattern", "timezone", "calendarType", "status"];

const pickScheduleFields = (body) => Object.fromEntries(
	scheduleFields
		.filter((field) => Object.prototype.hasOwnProperty.call(body, field))
		.map((field) => [field, body[field]])
);

const validateId = (id) => {
	if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid schedule id");
};

const getSchedules = asyncHandler(async (req, res) => {
	const filters = {};
	if (req.query.status) filters.status = req.query.status;

	const schedules = await WorkingSchedule.find(filters).sort({ name: 1 });
	return res.status(200).json(new ApiResponse(200, schedules));
});

const getScheduleById = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const schedule = await WorkingSchedule.findById(req.params.id);

	if (!schedule) throw new ApiError(404, "Schedule not found");
	return res.status(200).json(new ApiResponse(200, schedule));
});

const createSchedule = asyncHandler(async (req, res) => {
	const data = pickScheduleFields(req.body || {});
	if (!data.name || data.weeklyPattern === undefined || data.weeklyPattern === null) throw new ApiError(400, "name and weeklyPattern are required");
	data.weeklyHours = computeWeeklyHours(data.weeklyPattern);

	const schedule = new WorkingSchedule(data);
	await schedule.save();
	return res.status(201).json(new ApiResponse(201, schedule, "Schedule created"));
});

const updateSchedule = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const data = pickScheduleFields(req.body || {});
	if (!Object.keys(data).length) throw new ApiError(400, "No schedule fields supplied");
	if (Object.prototype.hasOwnProperty.call(data, "weeklyPattern")) {
		data.weeklyHours = computeWeeklyHours(data.weeklyPattern);
	}

	const schedule = await WorkingSchedule.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
	if (!schedule) throw new ApiError(404, "Schedule not found");
	return res.status(200).json(new ApiResponse(200, schedule, "Schedule updated"));
});

const archiveSchedule = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const schedule = await WorkingSchedule.findByIdAndUpdate(req.params.id, { status: "archived" }, { new: true, runValidators: true });
	if (!schedule) throw new ApiError(404, "Schedule not found");
	return res.status(200).json(new ApiResponse(200, schedule, "Schedule archived"));
});

const reactivateSchedule = asyncHandler(async (req, res) => {
	validateId(req.params.id);
	const schedule = await WorkingSchedule.findByIdAndUpdate(req.params.id, { status: "active" }, { new: true, runValidators: true });
	if (!schedule) throw new ApiError(404, "Schedule not found");
	return res.status(200).json(new ApiResponse(200, schedule, "Schedule reactivated"));
});

export {
	getSchedules,
	getScheduleById,
	createSchedule,
	updateSchedule,
	archiveSchedule,
	reactivateSchedule,
};
