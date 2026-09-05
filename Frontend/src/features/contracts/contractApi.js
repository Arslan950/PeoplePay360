import { apiRequest } from "../../common/utils/api";

export const getContracts = (filters = {}) => {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null));
  return apiRequest(`/contracts${params.size ? `?${params}` : ""}`);
};
export const getContract = (id) => apiRequest(`/contracts/${id}`);
export const createContract = (input) => apiRequest("/contracts", { method: "POST", body: JSON.stringify(input) });
export const updateContract = (id, input) => apiRequest(`/contracts/${id}`, { method: "PUT", body: JSON.stringify(input) });
