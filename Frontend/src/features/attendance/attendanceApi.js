import { apiRequest } from "../../common/utils/api";

export const getAttendance = (filters = {}) => {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null));
  return apiRequest(`/attendance${params.size ? `?${params}` : ""}`);
};
export const checkIn = (input = {}) => apiRequest("/attendance/check-in", { method: "POST", body: JSON.stringify(input) });
export const checkOut = (id) => apiRequest(`/attendance/${id}/check-out`, { method: "POST" });
export const correctAttendance = (id, input) => apiRequest(`/attendance/${id}`, { method: "PUT", body: JSON.stringify(input) });
