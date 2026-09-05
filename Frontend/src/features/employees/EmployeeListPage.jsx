import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { deactivateEmployee, getEmployees, reactivateEmployee } from "./employeeApi";

export default function EmployeeListPage({ onAdd, onEdit }) {
  const { user, logout } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ department: "", status: "" });
  const [view, setView] = useState("list");
  const [error, setError] = useState("");

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

  return <main className="app-shell">
    <header className="page-header"><div><p className="eyebrow">PeoplePay360 / Directory</p><h1>Employees</h1></div><div className="page-actions">{user?.role === "admin" && <button onClick={onAdd}>Add employee</button>}<button className="secondary" onClick={logout}>Sign out</button></div></header>
    <section className="toolbar"><input placeholder="Department" value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })} /><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button className="secondary" onClick={() => setView(view === "list" ? "kanban" : "list")}>{view === "list" ? "Kanban view" : "List view"}</button></section>
    {error && <p className="error">{error}</p>}
    {view === "list" ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>Department</th><th>Position</th><th>Status</th>{user?.role === "admin" && <th>Account</th>}</tr></thead><tbody>{employees.map((employee) => <tr key={employee._id}><td>{user?.role === "admin" ? <button className="link-button" onClick={() => onEdit(employee)}>{employee.name}</button> : employee.name}<small>{employee.email}</small></td><td>{employee.department || "-"}</td><td>{employee.jobPosition || "-"}</td><td><span className={`status ${employee.status}`}>{employee.status}</span></td>{user?.role === "admin" && <td><button className="link-button" onClick={() => changeStatus(employee)}>{employee.status === "active" ? "Deactivate" : "Reactivate"}</button></td>}</tr>)}</tbody></table></div> : <div className="kanban-grid">{employees.map((employee) => <article className="employee-card" key={employee._id}><span className={`status ${employee.status}`}>{employee.status}</span><h2>{employee.name}</h2><p>{employee.jobPosition || "No position"}</p><p className="muted">{employee.department || "No department"}</p>{user?.role === "admin" && <button className="link-button" onClick={() => changeStatus(employee)}>{employee.status === "active" ? "Deactivate" : "Reactivate"}</button>}</article>)}</div>}
  </main>;
}
