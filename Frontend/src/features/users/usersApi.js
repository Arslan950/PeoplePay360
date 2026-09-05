import { apiRequest } from "../../common/utils/api";

export const createUser = (input) => apiRequest("/users", { method: "POST", body: JSON.stringify(input) });
export const updateUserRole = (id, role) => apiRequest(`/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) });
export const deactivateUser = (id) => apiRequest(`/users/${id}/deactivate`, { method: "PUT" });
export const reactivateUser = (id) => apiRequest(`/users/${id}/reactivate`, { method: "PUT" });
