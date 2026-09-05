import { apiRequest } from "../../common/utils/api";

export const getSalaryStructures = () => apiRequest("/payroll/salary-structures");
export const createSalaryStructure = (input) => apiRequest("/payroll/salary-structures", { method: "POST", body: JSON.stringify(input) });
export const updateSalaryStructure = (id, input) => apiRequest(`/payroll/salary-structures/${id}`, { method: "PUT", body: JSON.stringify(input) });
export const deleteSalaryStructure = (id) => apiRequest(`/payroll/salary-structures/${id}`, { method: "DELETE" });

export const getPayruns = () => apiRequest("/payroll/payruns");
export const getPayrun = (id) => apiRequest(`/payroll/payruns/${id}`);
export const createPayrunDraft = (input) => apiRequest("/payroll/payruns/draft", { method: "POST", body: JSON.stringify(input) });
export const setPayrunEmployees = (id, employeeIds) => apiRequest(`/payroll/payruns/${id}/employees`, { method: "PUT", body: JSON.stringify({ employeeIds }) });
export const computePayrun = (id) => apiRequest(`/payroll/payruns/${id}/compute`, { method: "POST" });
export const validatePayrun = (id) => apiRequest(`/payroll/payruns/${id}/validate`, { method: "POST" });
export const markPayrunPaid = (id) => apiRequest(`/payroll/payruns/${id}/mark-paid`, { method: "POST" });
export const sendPayrunPayslips = (id) => apiRequest(`/payroll/payruns/${id}/send-payslips`, { method: "POST" });

export const getPayslips = () => apiRequest("/payroll/payslips");
export const getPayslip = (id) => apiRequest(`/payroll/payslips/${id}`);
export const payslipPdfUrl = (id) => `${import.meta.env.VITE_API_URL || "/api"}/payroll/payslips/${id}/pdf`;
