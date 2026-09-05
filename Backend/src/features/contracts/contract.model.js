import mongoose from "mongoose";

const contractSchema = new mongoose.Schema({
	contractNumber: { type: String, required: true, unique: true, trim: true },
	employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
	department: { type: String, trim: true, default: "" },
	jobPosition: { type: String, trim: true, default: "" },
	startDate: { type: Date, required: true },
	endDate: { type: Date, default: null },
	wagePerMonth: { type: Number, required: true, min: 0 },
	workingSchedule: { type: mongoose.Schema.Types.ObjectId, ref: "WorkingSchedule", default: null },
	salaryStructure: { type: mongoose.Schema.Types.ObjectId, default: null },
	notes: { type: String, default: "" },
}, { timestamps: true });

export const Contract = mongoose.model("Contract", contractSchema);
