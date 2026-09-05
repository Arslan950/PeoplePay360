import { apiRequest } from "../../common/utils/api";

// Time Off Types
export const getTimeoffTypes = (filters = {}) => {
	const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null));
	return apiRequest(`/timeoff/types${params.size ? `?${params}` : ""}`);
};

export const createTimeoffType = (input) => {
	return apiRequest("/timeoff/types", {
		method: "POST",
		body: JSON.stringify(input),
	});
};

export const updateTimeoffType = (id, input) => {
	return apiRequest(`/timeoff/types/${id}`, {
		method: "PUT",
		body: JSON.stringify(input),
	});
};

// Allocations
export const getAllocations = (filters = {}) => {
	const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null));
	return apiRequest(`/timeoff/allocations${params.size ? `?${params}` : ""}`);
};

export const createAllocation = (input) => {
	return apiRequest("/timeoff/allocations", {
		method: "POST",
		body: JSON.stringify(input),
	});
};

// Requests
export const getRequests = (filters = {}) => {
	const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null));
	return apiRequest(`/timeoff/requests${params.size ? `?${params}` : ""}`);
};

export const createRequest = (input) => {
	return apiRequest("/timeoff/requests", {
		method: "POST",
		body: JSON.stringify(input),
	});
};

export const approveRequest = (id) => {
	return apiRequest(`/timeoff/requests/${id}/approve`, {
		method: "POST",
	});
};

export const refuseRequest = (id, reason) => {
	const body = reason ? JSON.stringify({ refusalReason: reason }) : undefined;
	return apiRequest(`/timeoff/requests/${id}/refuse`, {
		method: "POST",
		body,
	});
};
