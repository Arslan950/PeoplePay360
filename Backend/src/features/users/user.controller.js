import mongoose from "mongoose";
import { User, USER_ROLES } from "./user.model.js";
import { Employee } from "../employees/employee.model.js";
import { generateTempPassword, hashPassword } from "./user.service.js";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";

const publicUserFields = "email role employee isActive";
const isValidRole = (role) => USER_ROLES.includes(role);
const validateId = (id) => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid user id");
};

const createUser = asyncHandler(async (req, res) => {
    const { email, role, employeeId } = req.body;
    if (!email || !role || !isValidRole(role)) throw new ApiError(400, "email and a valid role are required");

    let employee = null;
    if (employeeId) {
        if (!mongoose.isValidObjectId(employeeId)) throw new ApiError(400, "Invalid employee id");
        employee = await Employee.findById(employeeId);
        if (!employee) throw new ApiError(404, "Employee not found");
        if (employee.user) throw new ApiError(409, "This employee already has a login account");
    }

    const tempPassword = generateTempPassword();
    try {
        const user = await User.create({ email, role, employee: employee?._id ?? null, passwordHash: await hashPassword(tempPassword) });
        if (employee) await Employee.findByIdAndUpdate(employee._id, { user: user._id });
        return res.status(201).json(new ApiResponse(201, { user: await User.findById(user._id).select(publicUserFields), tempPassword }, "User created; share the temporary password out-of-band"));
    } catch (error) {
        if (error?.code === 11000) throw new ApiError(409, "A user with that email already exists");
        throw error;
    }
});

const updateUserRole = asyncHandler(async (req, res) => {
    validateId(req.params.id);
    const { role } = req.body;
    if (!isValidRole(role)) throw new ApiError(400, "Invalid role");

    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "User not found");
    if (user.role === "admin" && role !== "admin" && user.isActive) {
        const adminCount = await User.countDocuments({ role: "admin", isActive: true });
        if (adminCount <= 1) throw new ApiError(409, "The last active admin cannot be demoted");
    }

    user.role = role;
    await user.save();
    return res.status(200).json(new ApiResponse(200, await User.findById(user._id).select(publicUserFields), "User role updated"));
});

const deactivateUser = asyncHandler(async (req, res) => {
    validateId(req.params.id);
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, "User not found");
    if (user.role === "admin" && user.isActive) {
        const adminCount = await User.countDocuments({ role: "admin", isActive: true });
        if (adminCount <= 1) throw new ApiError(409, "The last active admin cannot be deactivated");
    }

    user.isActive = false;
    await user.save();
    return res.status(200).json(new ApiResponse(200, await User.findById(user._id).select(publicUserFields), "User deactivated"));
});

const reactivateUser = asyncHandler(async (req, res) => {
    validateId(req.params.id);
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true, runValidators: true }).select(publicUserFields);
    if (!user) throw new ApiError(404, "User not found");
    return res.status(200).json(new ApiResponse(200, user, "User reactivated"));
});

export { createUser, updateUserRole, deactivateUser, reactivateUser };
