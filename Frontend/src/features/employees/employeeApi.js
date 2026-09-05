import { apiRequest } from "../../common/utils/api";

export const getEmployees = (filters = {}) => {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return apiRequest(`/employees${params.size ? `?${params}` : ""}`);
};
export const getEmployee = (id) => apiRequest(`/employees/${id}`);
export const createEmployee = (input) => apiRequest("/employees", { method: "POST", body: JSON.stringify(input) });
export const updateEmployee = (id, input) => apiRequest(`/employees/${id}`, { method: "PUT", body: JSON.stringify(input) });
export const deactivateEmployee = (id) => apiRequest(`/employees/${id}/deactivate`, { method: "PUT" });
export const reactivateEmployee = (id) => apiRequest(`/employees/${id}/reactivate`, { method: "PUT" });
