import { Attendance } from "../attendance/attendance.model.js";
import { Request as TimeoffRequest } from "../timeoff/request.model.js";
import "../timeoff/timeoffType.model.js";

const DAY_MS = 86400000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const startOfDay = (value) => {
	const date = new Date(value);
	date.setHours(0, 0, 0, 0);
	return date;
};

const toAttendanceDate = (value) => {
	const date = new Date(value);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const getScheduleEntryForDate = (schedule, value) => {
	const schedulePattern = Array.isArray(schedule?.weeklyPattern) ? schedule.weeklyPattern : null;
	if (!schedulePattern) return null;

	const date = new Date(value);
	const weekday = WEEKDAYS[date.getDay()];
	const shortWeekday = SHORT_WEEKDAYS[date.getDay()];
	return schedulePattern.find((entry) => entry?.day === weekday || entry?.day === shortWeekday) || null;
};

// Keep the working-day iteration in one place so payroll and dashboard coverage
// always use the same schedule semantics (including the weekday fallback).
const getExpectedWorkingDates = (period, schedule) => {
	const startDate = startOfDay(period.startDate);
	const endDate = startOfDay(period.endDate);
	const schedulePattern = Array.isArray(schedule?.weeklyPattern) ? schedule.weeklyPattern : null;
	const expectedDates = [];

	for (const date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
		const scheduleEntry = getScheduleEntryForDate(schedule, date);
		const isWorkingDay = schedulePattern
			? scheduleEntry?.isWorkingDay === true
			: date.getDay() >= 1 && date.getDay() <= 5;
		if (isWorkingDay) expectedDates.push(toAttendanceDate(date));
	}

	return expectedDates;
};

const countExpectedWorkingDays = (period, schedule) => getExpectedWorkingDates(period, schedule).length;

const overlapDays = (request, period) => {
	const overlapStart = Math.max(startOfDay(request.startDate).getTime(), startOfDay(period.startDate).getTime());
	const overlapEnd = Math.min(startOfDay(request.endDate).getTime(), startOfDay(period.endDate).getTime());
	return Math.max(0, Math.floor((overlapEnd - overlapStart) / DAY_MS) + 1);
};

const resolveWorkforceMetrics = async (employee, contract, period) => {
	const schedule = contract?.workingSchedule || employee?.workingSchedule || null;
	const scheduleApplied = Boolean(schedule);
	const expectedWorkingDays = countExpectedWorkingDays(period, schedule);
	const from = toAttendanceDate(period.startDate);
	const to = toAttendanceDate(period.endDate);
	const workedDays = await Attendance.countDocuments({
		employee: employee._id,
		date: { $gte: from, $lte: to },
		status: "closed",
	});

	const requests = await TimeoffRequest.find({
		employee: employee._id,
		status: "approved",
		startDate: { $lte: new Date(period.endDate) },
		endDate: { $gte: new Date(period.startDate) },
	}).populate("timeoffType", "requiresAllocation");

	let paidLeaveDays = 0;
	let unpaidLeaveDays = 0;
	for (const request of requests) {
		const days = overlapDays(request, period);
		if (request.timeoffType?.requiresAllocation === true) paidLeaveDays += days;
		else unpaidLeaveDays += days;
	}

	return { expectedWorkingDays, scheduleApplied, workedDays, paidLeaveDays, unpaidLeaveDays };
};

export { resolveWorkforceMetrics, countExpectedWorkingDays, getExpectedWorkingDates, getScheduleEntryForDate, overlapDays };
