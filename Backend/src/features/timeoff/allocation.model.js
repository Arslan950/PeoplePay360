import mongoose from "mongoose";

const allocationSchema = new mongoose.Schema({
	employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
	timeoffType: { type: mongoose.Schema.Types.ObjectId, ref: "TimeoffType", required: true },
	totalDays: { type: Number, required: true, min: 0 },
	takenDays: { type: Number, default: 0, min: 0 },
	validFrom: { type: Date, default: null },
	validTo: { type: Date, default: null },
	status: { type: String, enum: ["pending", "approved"], default: "approved" },
}, { timestamps: true });

// Virtual field for remaining days
allocationSchema.virtual("remainingDays").get(function () {
	return this.totalDays - this.takenDays;
});

// Ensure virtuals are included when converting to JSON
allocationSchema.set("toJSON", { virtuals: true });
allocationSchema.set("toObject", { virtuals: true });

// Index for efficient queries
allocationSchema.index({ employee: 1, timeoffType: 1 });

export const Allocation = mongoose.model("Allocation", allocationSchema);
