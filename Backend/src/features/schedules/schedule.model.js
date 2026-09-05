import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	// weeklyPattern is expected to be an array of 7 entries, one per day, each shaped like:
	// { day, isWorkingDay, startTime, endTime, breakMinutes }
	weeklyPattern: { type: mongoose.Schema.Types.Mixed, default: [] },
	weeklyHours: { type: Number, min: 0 },
	timezone: { type: String, trim: true },
	calendarType: { type: String, enum: ["fixed", "flexible"], default: "fixed" },
	status: { type: String, enum: ["active", "archived"], default: "active" },
}, { timestamps: true });

export const WorkingSchedule = mongoose.model("WorkingSchedule", scheduleSchema);
