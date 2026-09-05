import { ApiError } from "../../utils/api-error.js";
import { Allocation } from "./allocation.model.js";

/**
 * Computes inclusive day count between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Inclusive day count
 * @throws {ApiError} If endDate is before startDate
 */
export function computeDuration(startDate, endDate) {
	const msPerDay = 86400000; // 24 * 60 * 60 * 1000
	const start = new Date(startDate);
	const end = new Date(endDate);
	
	if (end < start) {
		throw new ApiError(400, "endDate must be after or equal to startDate");
	}
	
	return Math.round((end - start) / msPerDay) + 1;
}

/**
 * Finds suitable allocation for request approval
 * Prefers allocations with future/null validTo, earliest validFrom
 * @param {ObjectId} employeeId - Employee ID
 * @param {ObjectId} timeoffTypeId - TimeoffType ID
 * @param {number} duration - Required duration
 * @returns {Promise<Allocation|null>} Suitable allocation or null
 */
export async function findSuitableAllocation(employeeId, timeoffTypeId, duration) {
	const now = new Date();
	
	// Query allocations matching criteria with sufficient balance
	const allocations = await Allocation.find({
		employee: employeeId,
		timeoffType: timeoffTypeId,
		status: "approved",
		$expr: { $gte: [{ $subtract: ["$totalDays", "$takenDays"] }, duration] }
	}).sort({ validTo: 1, validFrom: 1 });
	
	// Filter allocations by validity dates
	for (const allocation of allocations) {
		// Skip if validFrom is in the future
		if (allocation.validFrom && allocation.validFrom > now) continue;
		
		// Skip if validTo is in the past
		if (allocation.validTo && allocation.validTo < now) continue;
		
		// This allocation is suitable
		return allocation;
	}
	
	return null;
}
