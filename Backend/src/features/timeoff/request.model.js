import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
	employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
	timeoffType: { type: mongoose.Schema.Types.ObjectId, ref: "TimeoffType", required: true },
	startDate: { type: Date, required: true },
	endDate: { type: Date, required: true },
	duration: { type: Number },
	status: { type: String, enum: ["pending", "approved", "refused"], default: "pending" },
	reason: { type: String, default: "" },
	refusalReason: { type: String, default: null },
	allocation: { type: mongoose.Schema.Types.ObjectId, ref: "Allocation", default: null },
}, { timestamps: true });

// Indexes for efficient queries
requestSchema.index({ employee: 1, status: 1 });
requestSchema.index({ status: 1 });

export const Request = mongoose.model("Request", requestSchema);
