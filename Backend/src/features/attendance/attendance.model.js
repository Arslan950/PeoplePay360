import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
	employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
	checkIn: { type: Date, required: true, default: Date.now },
	checkOut: { type: Date, default: null },
	durationMinutes: { type: Number, min: 0, default: null },
	notes: { type: String, trim: true, default: "" },
	source: { type: String, trim: true, default: null },
}, { timestamps: true });

attendanceSchema.index(
	{ employee: 1, checkOut: 1 },
	{ unique: true, partialFilterExpression: { checkOut: null } }
);

export const Attendance = mongoose.model("Attendance", attendanceSchema);
