import { useState } from "react";
import { createEmployee, updateEmployee } from "./employeeApi";
import { createUser, deactivateUser, reactivateUser, updateUserRole } from "../users/usersApi";
import { useAuth } from "../auth/AuthContext";

const roles = ["employee", "hr_manager", "hr_payroll_user", "hr_payroll_manager", "admin"];

export default function EmployeeFormPage({ employee, onSaved, onCancel }) {
  const { user } = useAuth();
  const [form, setForm] = useState(employee || { name: "", email: "", phone: "", department: "", jobPosition: "", employeeType: "", status: "active", joinDate: "" });
  const [account, setAccount] = useState(employee?.user || null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";

  const save = async (event) => {
    event.preventDefault();
    try {
      const saved = employee ? await updateEmployee(employee._id, form) : await createEmployee(form);
      onSaved?.(saved);
    } catch (requestError) { setError(requestError.message); }
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
    } catch (requestError) { setError(requestError.message); }
  };

  return <main className="form-shell"><button type="button" className="form-close" aria-label="Close form" onClick={onCancel}>×</button><form className="form-card" onSubmit={save}><p className="eyebrow">Employee record</p><h1>{employee ? "Edit employee" : "Add employee"}</h1>{["name", "email", "phone", "department", "jobPosition", "employeeType", "joinDate"].map((field) => <label key={field}>{field}<input type={field === "joinDate" ? "date" : field === "email" ? "email" : "text"} value={form[field] || ""} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required={field === "name" || field === "email"} /></label>)}<label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>{error && <p className="error">{error}</p>}<button type="submit">Save employee</button></form>{isAdmin && employee && <section className="form-card"><p className="eyebrow">Login access</p><h2>Manage account</h2>{account ? <><p>{account.email} · {account.isActive ? "Active" : "Inactive"}</p><label>Role<select value={account.role} onChange={(event) => { setAccount({ ...account, role: event.target.value }); updateUserRole(account._id, event.target.value).then(setAccount).catch((requestError) => setError(requestError.message)); }}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label><button className="secondary" onClick={() => manageAccount("toggle")}>{account.isActive ? "Deactivate account" : "Reactivate account"}</button></> : <button onClick={() => manageAccount("create")}>Create login</button>}</section>}{temporaryPassword && <div className="modal"><div className="modal-card"><h2>Temporary password</h2><p>{temporaryPassword}</p><button onClick={() => setTemporaryPassword("")}>Dismiss</button></div></div>}</main>;
}
