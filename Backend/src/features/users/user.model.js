import mongoose from "mongoose";

export const USER_ROLES = ["employee", "hr_manager", "hr_payroll_user", "hr_payroll_manager", "admin"];

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "employee" },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", unique: true, sparse: true, default: null },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
