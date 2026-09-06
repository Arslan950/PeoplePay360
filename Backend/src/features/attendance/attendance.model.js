import mongoose from "mongoose";

const getLocalDateString = (value) => {
	const date = new Date(value);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const attendanceSchema = new mongoose.Schema({
	employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
	checkIn: { type: Date, required: true, default: Date.now },
	date: { type: String, required: true, index: true },
	checkOut: { type: Date, default: null },
	status: { type: String, enum: ["open", "closed"], default: "open", index: true },
	durationMinutes: { type: Number, min: 0, default: null },
	notes: { type: String, trim: true, default: "" },
	source: { type: String, trim: true, default: null },
	wasCorrected: { type: Boolean, default: false },
}, { timestamps: true });

attendanceSchema.pre("validate", function () {
	if (this.checkIn && !Number.isNaN(new Date(this.checkIn).getTime())) {
		this.date = getLocalDateString(this.checkIn);
	}
	this.status = this.checkOut ? "closed" : "open";
});

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
