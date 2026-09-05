import mongoose from "mongoose";

const timeoffTypeSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	unit: { type: String, enum: ["days", "hours"], default: "days" },
	requiresAllocation: { type: Boolean, default: true },
	requiresApproval: { type: Boolean, default: true },
	status: { type: String, enum: ["active", "archived"], default: "active" },
}, { timestamps: true });

export const TimeoffType = mongoose.model("TimeoffType", timeoffTypeSchema);
