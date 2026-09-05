import mongoose from "mongoose";

const contractSchema = new mongoose.Schema({
	contractNumber: { type: String, required: true, unique: true, trim: true },
	employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
	department: { type: String, trim: true, default: "" },
	jobPosition: { type: String, trim: true, default: "" },
	startDate: { type: Date, required: true },
	endDate: { type: Date, default: null },
	wageType: { type: String, enum: ["monthly", "hourly"], required: true, default: "monthly" },
	wageAmount: { type: Number, min: 0 },
	wagePerMonth: { type: Number, min: 0 },
	wage: { type: Number, min: 0 },
	workingSchedule: { type: mongoose.Schema.Types.ObjectId, ref: "WorkingSchedule", default: null },
	salaryStructure: { type: mongoose.Schema.Types.ObjectId, default: null },
	notes: { type: String, default: "" },
}, { timestamps: true });

contractSchema.pre("validate", function preValidate(next) {
	if (this.wageAmount === undefined || this.wageAmount === null) {
		const fallback = this.wageAmount ?? this.wagePerMonth ?? this.wage;
		if (fallback !== undefined && fallback !== null) {
			this.wageAmount = Number(fallback);
		}
	}
	if ((this.wageAmount === undefined || this.wageAmount === null) && this.wageType === "monthly") {
		this.invalidate("wageAmount", "wageAmount is required");
	}
	if (this.wageType === undefined || this.wageType === null) {
		this.wageType = "monthly";
	}
	next();
});

export const Contract = mongoose.model("Contract", contractSchema);
