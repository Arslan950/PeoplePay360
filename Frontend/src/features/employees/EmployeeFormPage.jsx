import { useEffect, useState } from "react";
import { createEmployee, getEmployees, updateEmployee } from "./employeeApi";
import { createUser, deactivateUser, reactivateUser, updateUserRole } from "../users/usersApi";
import { useAuth } from "../auth/AuthContext";
import { getSchedules } from "../schedules/scheduleApi";
import SmartButtonsBar from "./components/SmartButtonsBar";

const roles = ["employee", "hr_manager", "hr_payroll_user", "hr_payroll_manager", "admin"];
const emptyEmployeeForm = { name: "", email: "", phone: "", department: "", jobPosition: "", workLocation: "", manager: "", workingSchedule: "", employeeType: "", status: "active", joinDate: "" };

const getEmployeeForm = (employee) => employee ? {
  ...emptyEmployeeForm,
  ...employee,
  manager: employee.manager?._id || employee.manager || "",
  workingSchedule: employee.workingSchedule?._id || employee.workingSchedule || "",
  joinDate: employee.joinDate ? employee.joinDate.slice(0, 10) : "",
} : emptyEmployeeForm;

export default function EmployeeFormPage({ employee, onSaved, onCancel }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => getEmployeeForm(employee));
  const [account, setAccount] = useState(employee?.user || null);
  const [managers, setManagers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    getEmployees()
      .then(setManagers)
      .catch((requestError) => setError(requestError.message));
    getSchedules({ status: "active" })
      .then(setSchedules)
      .catch((requestError) => setError(requestError.message));
  }, []);

  const save = async (event) => {
    event.preventDefault();
    try {
      const saved = employee ? await updateEmployee(employee._id, form) : await createEmployee(form);
      if (!employee) {
        setTemporaryPassword(saved.temporaryPassword);
        return;
      }
      onSaved?.(saved);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const manageAccount = async (action) => {
    try {
      if (action === "create") {
        const data = await createUser({ email: form.email, role: "employee", employeeId: employee._id });
        setAccount(data.user);
        setTemporaryPassword(data.tempPassword);
      } else if (action === "role") {
        setAccount(await updateUserRole(account._id, account.role));
      } else if (action === "toggle") {
        const data = account.isActive ? await deactivateUser(account._id) : await reactivateUser(account._id);
        setAccount(data);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const dismissTemporaryPassword = () => {
    setTemporaryPassword("");
    if (!employee) onSaved?.();
  };

  return (
    <main className="form-shell">
      <button type="button" className="form-close" aria-label="Close form" onClick={onCancel}>x</button>
      <form className="form-card" onSubmit={save}>
        <p className="eyebrow">Employee record</p>
        <h1>{employee ? "Edit employee" : "Add employee"}</h1>
        {employee && <SmartButtonsBar employeeId={employee._id} />}
        {["name", "email", "phone"].map((field) => (
          <label key={field}>
            {field}
            <input
              type={field === "joinDate" ? "date" : field === "email" ? "email" : "text"}
              value={form[field] || ""}
              onChange={(event) => setForm({ ...form, [field]: event.target.value })}
              required={field === "name" || field === "email"}
            />
          </label>
        ))}
        <section className="work-information">
          <p className="eyebrow">Work information</p>
          {["department", "jobPosition", "employeeType", "joinDate"].map((field) => (
            <label key={field}>
              {field}
              <input
                type={field === "joinDate" ? "date" : "text"}
                value={form[field] || ""}
                onChange={(event) => setForm({ ...form, [field]: event.target.value })}
              />
            </label>
          ))}
          <label>
            Manager
            <select value={form.manager || ""} onChange={(event) => setForm({ ...form, manager: event.target.value })}>
              <option value="">None</option>
              {managers.filter((manager) => manager._id !== employee?._id).map((manager) => <option key={manager._id} value={manager._id}>{manager.name}</option>)}
            </select>
          </label>
          <label>
            Working Schedule
            <select value={form.workingSchedule || ""} onChange={(event) => setForm({ ...form, workingSchedule: event.target.value })}>
              <option value="">None</option>
              {schedules.map((schedule) => <option key={schedule._id} value={schedule._id}>{schedule.name}</option>)}
            </select>
          </label>
          <label>
            Work Location
            <input type="text" value={form.workLocation || ""} onChange={(event) => setForm({ ...form, workLocation: event.target.value })} />
          </label>
        </section>
        <label>
          Status
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Save employee</button>
      </form>

      {isAdmin && employee && (
        <section className="form-card">
          <p className="eyebrow">Login access</p>
          <h2>Manage account</h2>
          {account ? (
            <>
              <p>{account.email} - {account.isActive ? "Active" : "Inactive"}</p>
              <label>
                Role
                <select
                  value={account.role}
                  onChange={(event) => {
                    setAccount({ ...account, role: event.target.value });
                    updateUserRole(account._id, event.target.value)
                      .then(setAccount)
                      .catch((requestError) => setError(requestError.message));
                  }}
                >
                  {roles.map((role) => <option key={role}>{role}</option>)}
                </select>
              </label>
              <button type="button" className="secondary" onClick={() => manageAccount("toggle")}>
                {account.isActive ? "Deactivate account" : "Reactivate account"}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => manageAccount("create")}>Create login</button>
          )}
        </section>
      )}

      {temporaryPassword && (
        <div className="modal">
          <div className="modal-card">
            <h2>Temporary password</h2>
            <p>{temporaryPassword}</p>
            <p className="muted">Copy it now. It will not be shown again.</p>
            <button type="button" onClick={dismissTemporaryPassword}>Dismiss</button>
          </div>
        </div>
      )}
    </main>
  );
}
