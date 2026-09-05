import { apiRequest } from "../../common/utils/api";

export const getSchedules = (filters = {}) => {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return apiRequest(`/schedules${params.size ? `?${params}` : ""}`);
};
export const getSchedule = (id) => apiRequest(`/schedules/${id}`);
export const createSchedule = (input) => apiRequest("/schedules", { method: "POST", body: JSON.stringify(input) });
export const updateSchedule = (id, input) => apiRequest(`/schedules/${id}`, { method: "PUT", body: JSON.stringify(input) });
export const archiveSchedule = (id) => apiRequest(`/schedules/${id}/archive`, { method: "PUT" });
export const reactivateSchedule = (id) => apiRequest(`/schedules/${id}/reactivate`, { method: "PUT" });
