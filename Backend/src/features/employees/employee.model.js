import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	email: { type: String, required: true, unique: true, lowercase: true, trim: true },
	phone: { type: String, trim: true },
	department: { type: String, trim: true },
	jobPosition: { type: String, trim: true },
	manager: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
	workingSchedule: { type: mongoose.Schema.Types.ObjectId, ref: "WorkingSchedule", default: null },
	employeeType: { type: String, trim: true },
	status: { type: String, enum: ["active", "inactive"], default: "active" },
	joinDate: { type: Date },
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

export const Employee = mongoose.model("Employee", employeeSchema);
