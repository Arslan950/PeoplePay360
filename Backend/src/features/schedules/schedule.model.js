import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	weeklyPattern: { type: mongoose.Schema.Types.Mixed, default: {} },
	weeklyHours: { type: Number, min: 0 },
	timezone: { type: String, trim: true },
}, { timestamps: true });

export const WorkingSchedule = mongoose.model("WorkingSchedule", scheduleSchema);
