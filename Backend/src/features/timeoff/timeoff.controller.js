import mongoose from "mongoose";
import { ApiError } from "../../utils/api-error.js";
import { ApiResponse } from "../../utils/api-response.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { TimeoffType } from "./timeoffType.model.js";
import { Allocation } from "./allocation.model.js";
import { Request } from "./request.model.js";
import { Employee } from "../employees/employee.model.js";
import { computeDuration, findSuitableAllocation } from "./timeoff.service.js";

// ========== TIME OFF TYPES ==========

export const getTimeoffTypes = asyncHandler(async (req, res) => {
	const filters = {};
	if (req.query.status) {
		filters.status = req.query.status;
	}
	
	const types = await TimeoffType.find(filters);
	return res.status(200).json(new ApiResponse(200, types));
});

export const createTimeoffType = asyncHandler(async (req, res) => {
	const { name, unit, requiresAllocation, requiresApproval, status } = req.body;
	
	if (!name) {
		throw new ApiError(400, "name is required");
	}
	
	const typeData = { name };
	if (unit !== undefined) typeData.unit = unit;
	if (requiresAllocation !== undefined) typeData.requiresAllocation = requiresAllocation;
	if (requiresApproval !== undefined) typeData.requiresApproval = requiresApproval;
	if (status !== undefined) typeData.status = status;
	
	const type = await TimeoffType.create(typeData);
	return res.status(201).json(new ApiResponse(201, type, "Time off type created"));
});

export const updateTimeoffType = asyncHandler(async (req, res) => {
	const { id } = req.params;
	
	if (!mongoose.isValidObjectId(id)) {
		throw new ApiError(400, "Invalid time off type id");
	}
	
	const { name, unit, requiresAllocation, requiresApproval, status } = req.body;
	const updateData = {};
	
	if (name !== undefined) updateData.name = name;
	if (unit !== undefined) updateData.unit = unit;
	if (requiresAllocation !== undefined) updateData.requiresAllocation = requiresAllocation;
	if (requiresApproval !== undefined) updateData.requiresApproval = requiresApproval;
	if (status !== undefined) updateData.status = status;
	
	if (Object.keys(updateData).length === 0) {
		throw new ApiError(400, "No fields to update");
	}
	
	const type = await TimeoffType.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
	
	if (!type) {
		throw new ApiError(404, "Time off type not found");
	}
	
	return res.status(200).json(new ApiResponse(200, type, "Time off type updated"));
});

// ========== ALLOCATIONS ==========

export const getAllocations = asyncHandler(async (req, res) => {
	const filters = {};
	
	// Role-based filtering
	if (req.user.role === "employee") {
		// Employees see only their own allocations
		filters.employee = req.user.employee;
	} else if (req.query.employee) {
		// Approvers can filter by employee query param
		filters.employee = req.query.employee;
	}
	
	const allocations = await Allocation.find(filters)
		.populate("employee", "name email")
		.populate("timeoffType", "name unit");
	
	// Add computed remainingDays field (already included via virtual)
	return res.status(200).json(new ApiResponse(200, allocations));
});

export const createAllocation = asyncHandler(async (req, res) => {
	const { employee, timeoffType, totalDays, validFrom, validTo } = req.body;
	
	if (!employee || !timeoffType || totalDays === undefined) {
		throw new ApiError(400, "employee, timeoffType, and totalDays are required");
	}
	
	if (!mongoose.isValidObjectId(employee)) {
		throw new ApiError(400, "Invalid employee id");
	}
	
	if (!mongoose.isValidObjectId(timeoffType)) {
		throw new ApiError(400, "Invalid timeoffType id");
	}
	
	// Validate employee exists
	const employeeExists = await Employee.findById(employee);
	if (!employeeExists) {
		throw new ApiError(404, "Employee not found");
	}
	
	// Validate timeoffType exists
	const typeExists = await TimeoffType.findById(timeoffType);
	if (!typeExists) {
		throw new ApiError(404, "Time off type not found");
	}
	
	const allocationData = {
		employee,
		timeoffType,
		totalDays,
		status: "approved", // Auto-approved for approver-created allocations
	};
	
	if (validFrom !== undefined) allocationData.validFrom = validFrom;
	if (validTo !== undefined) allocationData.validTo = validTo;
	
	const allocation = await Allocation.create(allocationData);
	
	const populatedAllocation = await Allocation.findById(allocation._id)
		.populate("employee", "name email")
		.populate("timeoffType", "name unit");
	
	return res.status(201).json(new ApiResponse(201, populatedAllocation, "Allocation created"));
});

// ========== REQUESTS ==========

export const getRequests = asyncHandler(async (req, res) => {
	const filters = {};
	
	// Role-based filtering
	if (req.user.role === "employee") {
		// Employees see only their own requests
		filters.employee = req.user.employee;
	}
	
	// Status filtering
	if (req.query.status) {
		filters.status = req.query.status;
	}
	
	// Employee filtering (for approvers)
	if (req.query.employee && req.user.role !== "employee") {
		filters.employee = req.query.employee;
	}
	
	const requests = await Request.find(filters)
		.populate("employee", "name email")
		.populate("timeoffType", "name unit");
	
	return res.status(200).json(new ApiResponse(200, requests));
});

export const createRequest = asyncHandler(async (req, res) => {
	const { timeoffType, startDate, endDate, reason } = req.body;
	let { employee } = req.body;
	
	// Role-based employee assignment
	if (req.user.role === "employee") {
		// Employees can only create requests for themselves
		employee = req.user.employee;
	} else {
		// Approvers must provide employee field
		if (!employee) {
			throw new ApiError(400, "employee field is required");
		}
		if (!mongoose.isValidObjectId(employee)) {
			throw new ApiError(400, "Invalid employee id");
		}
	}
	
	if (!timeoffType || !startDate || !endDate) {
		throw new ApiError(400, "timeoffType, startDate, and endDate are required");
	}
	
	if (!mongoose.isValidObjectId(timeoffType)) {
		throw new ApiError(400, "Invalid timeoffType id");
	}
	
	// Validate timeoffType exists
	const typeExists = await TimeoffType.findById(timeoffType);
	if (!typeExists) {
		throw new ApiError(404, "Time off type not found");
	}
	
	// Compute duration
	const duration = computeDuration(new Date(startDate), new Date(endDate));
	
	const requestData = {
		employee,
		timeoffType,
		startDate: new Date(startDate),
		endDate: new Date(endDate),
		duration,
		status: "pending",
	};
	
	if (reason !== undefined) requestData.reason = reason;
	
	const request = await Request.create(requestData);
	
	const populatedRequest = await Request.findById(request._id)
		.populate("employee", "name email")
		.populate("timeoffType", "name unit");
	
	return res.status(201).json(new ApiResponse(201, populatedRequest, "Request created"));
});

export const approveRequest = asyncHandler(async (req, res) => {
	const { id } = req.params;
	
	if (!mongoose.isValidObjectId(id)) {
		throw new ApiError(400, "Invalid request id");
	}
	
	const request = await Request.findById(id);
	
	if (!request) {
		throw new ApiError(404, "Request not found");
	}
	
	if (request.status !== "pending") {
		throw new ApiError(400, "Only pending requests can be approved");
	}
	
	// Load associated TimeoffType
	const timeoffType = await TimeoffType.findById(request.timeoffType);
	
	if (!timeoffType) {
		throw new ApiError(404, "Time off type not found");
	}
	
	if (!timeoffType.requiresAllocation) {
		// No balance deduction needed
		request.status = "approved";
		await request.save();
	} else {
		// Find suitable allocation
		const allocation = await findSuitableAllocation(
			request.employee,
			request.timeoffType,
			request.duration
		);
		
		if (!allocation) {
			throw new ApiError(400, "Insufficient leave balance");
		}
		
		// Increment takenDays and link allocation
		allocation.takenDays += request.duration;
		request.status = "approved";
		request.allocation = allocation._id;
		
		// Save both atomically
		await Promise.all([allocation.save(), request.save()]);
	}
	
	const populatedRequest = await Request.findById(request._id)
		.populate("employee", "name email")
		.populate("timeoffType", "name unit");
	
	return res.status(200).json(new ApiResponse(200, populatedRequest, "Request approved"));
});

export const refuseRequest = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const { refusalReason } = req.body;
	
	if (!mongoose.isValidObjectId(id)) {
		throw new ApiError(400, "Invalid request id");
	}
	
	const request = await Request.findById(id);
	
	if (!request) {
		throw new ApiError(404, "Request not found");
	}
	
	if (request.status !== "pending") {
		throw new ApiError(400, "Only pending requests can be refused");
	}
	
	request.status = "refused";
	if (refusalReason !== undefined) {
		request.refusalReason = refusalReason;
	}
	
	await request.save();
	
	const populatedRequest = await Request.findById(request._id)
		.populate("employee", "name email")
		.populate("timeoffType", "name unit");
	
	return res.status(200).json(new ApiResponse(200, populatedRequest, "Request refused"));
});
