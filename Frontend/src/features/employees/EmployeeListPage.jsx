import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { deactivateEmployee, getEmployees, reactivateEmployee, resetEmployeeCredentials } from "./employeeApi";

export default function EmployeeListPage({ onAdd, onEdit }) {
  const { user, logout } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ department: "", status: "" });
  const [view, setView] = useState("list");
  const [credentials, setCredentials] = useState(null);
  const [error, setError] = useState("");

  const canManageEmployees = user?.role === "admin" || user?.role === "hr_manager";
  const canManageCredentials = user?.role === "admin" || user?.role === "hr_manager";

  const load = () => getEmployees(filters).then(setEmployees).catch((requestError) => setError(requestError.message));

  useEffect(() => {
    load();
  }, [filters.department, filters.status]);

  const changeStatus = async (employee) => {
    try {
      await (employee.status === "active" ? deactivateEmployee(employee._id) : reactivateEmployee(employee._id));
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const resetPassword = async (employee) => {
    try {
      setCredentials(await resetEmployeeCredentials(employee._id));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">PeoplePay360 / Directory</p>
          <h1>Employees</h1>
        </div>
        <div className="page-actions">
          {canManageEmployees && <button onClick={onAdd}>Add employee</button>}
          <button className="secondary" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="toolbar">
        <input placeholder="Department" value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })} />
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="secondary" onClick={() => setView(view === "list" ? "kanban" : "list")}>
          {view === "list" ? "Kanban view" : "List view"}
        </button>
      </section>

      {error && <p className="error">{error}</p>}

      {view === "list" ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Position</th>
                <th>Status</th>
                {canManageEmployees && <th>Account</th>}
                {canManageCredentials && <th>Credentials</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee._id}>
                  <td>
                    {canManageEmployees ? <button className="link-button" onClick={() => onEdit(employee)}>{employee.name}</button> : employee.name}
                    <small>{employee.email}</small>
                  </td>
                  <td>{employee.department || "-"}</td>
                  <td>{employee.jobPosition || "-"}</td>
                  <td><span className={`status ${employee.status}`}>{employee.status}</span></td>
                  {canManageEmployees && (
                    <td>
                      <button className="link-button" onClick={() => changeStatus(employee)}>
                        {employee.status === "active" ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  )}
                  {canManageCredentials && (
                    <td>
                      <button className="link-button" onClick={() => resetPassword(employee)}>
                        Reset password
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="kanban-grid">
          {employees.map((employee) => (
            <article className="employee-card" key={employee._id}>
              <span className={`status ${employee.status}`}>{employee.status}</span>
              <h2>
                {canManageEmployees ? <button className="link-button employee-card-name" onClick={() => onEdit(employee)}>{employee.name}</button> : employee.name}
              </h2>
              <p>{employee.jobPosition || "No position"}</p>
              <p className="muted">{employee.department || "No department"}</p>
              {canManageEmployees && (
                <button className="link-button" onClick={() => changeStatus(employee)}>
                  {employee.status === "active" ? "Deactivate" : "Reactivate"}
                </button>
              )}
              {canManageCredentials && (
                <button className="link-button" onClick={() => resetPassword(employee)}>
                  Reset password
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {credentials && (
        <div className="modal">
          <div className="modal-card">
            <p className="eyebrow">Password Reset Successful</p>
            <h2>New Temporary Credentials</h2>
            <p><strong>Email:</strong> {credentials.email}</p>
            <p><strong>Password:</strong> {credentials.temporaryPassword}</p>
            <p className="muted">The previous password has been revoked. Copy this temporary password now; it will not be shown again.</p>
            <button onClick={() => setCredentials(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </main>
  );
}