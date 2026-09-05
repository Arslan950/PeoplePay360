import { useEffect, useState } from "react";
import DateInput from "../../common/components/DateInput";
import { getEmployees } from "../employees/employeeApi";
import { getSchedules } from "../schedules/scheduleApi";
import { createContract, updateContract } from "./contractApi";
import { getSalaryStructures } from "../payroll/payrollApi";

const formatDateForInput = (val) => {
  if (!val) return "";
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    if (val.includes("T")) return val.split("T")[0];
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {
    // ignore
  }
  return "";
};

const emptyForm = {
  employee: "",
  department: "",
  jobPosition: "",
  startDate: "",
  endDate: "",
  wageMonthly: "",
  workingSchedule: "",
  salaryStructure: "",
  status: "draft",
  notes: "",
};

export default function ContractFormPage({ contract, onSaved, onCancel, employeeScope }) {
  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [salaryStructures, setSalaryStructures] = useState([]);
  const [form, setForm] = useState(() => {
    if (contract) {
      return {
        ...contract,
        employee: contract.employee?._id || contract.employee || employeeScope || "",
        startDate: formatDateForInput(contract.startDate),
        endDate: formatDateForInput(contract.endDate),
      };
    }
    return { ...emptyForm, employee: employeeScope || "" };
  });
  const [error, setError] = useState("");

  useEffect(() => {
    getEmployees().then(setEmployees).catch(() => undefined);
    getSchedules({ status: "active" }).then(setSchedules).catch(() => undefined);
    getSalaryStructures().then(setSalaryStructures).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!form.employee) return;
    const selectedEmployee = employees.find((employee) => employee._id === form.employee);
    if (!selectedEmployee) return;
    setForm((current) => ({
      ...current,
      department: current.department || selectedEmployee.department || "",
      jobPosition: current.jobPosition || selectedEmployee.jobPosition || "",
    }));
  }, [form.employee, employees]);

  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        employee: contract ? contract.employee?._id || contract.employee : form.employee,
        endDate: form.endDate || null,
        wageMonthly: Number(form.wageMonthly),
        workingSchedule: form.workingSchedule || null,
        salaryStructure: form.salaryStructure || null,
        notes: form.notes || "",
      };
      if (!payload.employee || !payload.startDate || Number.isNaN(payload.wageMonthly)) {
        throw new Error("Employee, start date, and wage are required");
      }
      const saved = contract ? await updateContract(contract._id, payload) : await createContract(payload);
      onSaved?.(saved);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <main className="form-shell">
      <button type="button" className="form-close" aria-label="Close form" onClick={onCancel}>x</button>
      <form className="form-card contract-form" onSubmit={save}>
        <header className="contract-form-header">
          <div>
            <p className="eyebrow">Contract</p>
            <h1>{contract ? "Edit contract" : "New contract"}</h1>
            <p className="muted">Set the employee's role, dates, pay, and working schedule.</p>
          </div>
        </header>
        <div className="contract-form-grid">
          <label>
            Employee
            <select
              value={form.employee}
              onChange={(event) => setForm({ ...form, employee: event.target.value })}
              disabled={Boolean(contract || employeeScope)}
            >
              <option value="">Select employee</option>
              {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
            </select>
          </label>
          <label>
            Department
            <input value={form.department || ""} onChange={(event) => setForm({ ...form, department: event.target.value })} />
          </label>
          <label>
            Job Position
            <input value={form.jobPosition || ""} onChange={(event) => setForm({ ...form, jobPosition: event.target.value })} />
          </label>
          <label>
            Wage / month
            <input type="number" min="0" step="0.01" value={form.wageMonthly || ""} onChange={(event) => setForm({ ...form, wageMonthly: event.target.value })} required />
          </label>
          <label>
            Start date
            <DateInput
              value={form.startDate || ""}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              placeholder="eg: 09-09-2026"
              required
            />
          </label>
          <label>
            End date
            <DateInput
              value={form.endDate || ""}
              onChange={(event) => setForm({ ...form, endDate: event.target.value })}
              placeholder="eg: 05-09-2028"
            />
          </label>
          <label>
            Working schedule
            <select value={form.workingSchedule || ""} onChange={(event) => setForm({ ...form, workingSchedule: event.target.value || "" })}>
              <option value="">No schedule</option>
              {schedules.map((schedule) => <option key={schedule._id} value={schedule._id}>{schedule.name}</option>)}
            </select>
          </label>
          <label>
            Salary structure
            <select value={form.salaryStructure || ""} onChange={(event) => setForm({ ...form, salaryStructure: event.target.value || null })}>
              <option value="">No structure</option>
              {salaryStructures.filter((structure) => structure.isActive).map((structure) => <option key={structure._id} value={structure._id}>{structure.name}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={form.status || "draft"} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="draft">Draft</option>
              <option value="running">Running</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <label className="contract-form-notes">
            Notes
            <textarea rows="4" value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <footer className="contract-form-actions">
          <button className="secondary" type="button" onClick={onCancel}>Cancel</button>
          <button type="submit">{contract ? "Save contract" : "Create contract"}</button>
        </footer>
      </form>
    </main>
  );
}
