import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../common/utils/api";
import { getEmployees } from "../employees/employeeApi";

const money = (value) => Number(value || 0).toLocaleString(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", department: "", employeeType: "", company: "" });
  const [error, setError] = useState("");
  const load = async (currentFilters = filters) => {
    try {
      const params = new URLSearchParams(Object.entries(currentFilters).filter(([, value]) => value));
      setData(await apiRequest(`/dashboard${params.size ? `?${params}` : ""}`));
      setError("");
    } catch (requestError) { setError(requestError.message); }
  };
  useEffect(() => { load(); getEmployees().then(setEmployees).catch(() => undefined); }, []);
  const departments = useMemo(() => [...new Set(employees.map((employee) => employee.department).filter(Boolean))].sort(), [employees]);
  const employeeTypes = useMemo(() => [...new Set(employees.map((employee) => employee.employeeType).filter(Boolean))].sort(), [employees]);
  const companies = useMemo(() => [...new Set(employees.map((employee) => employee.company).filter(Boolean))].sort(), [employees]);
  const apply = (event) => { event.preventDefault(); load(); };
  const highestDepartment = Math.max(...(data?.departmentCosts.map((row) => row.total) || [1]), 1);
  const highestMonth = Math.max(...(data?.monthlyNetSalaryTrend.map((row) => row.total) || [1]), 1);

  return <main className="app-shell">
    <header className="page-header"><div><p className="eyebrow">PeoplePay360 / Dashboard</p><h1>Dashboard</h1><p className="muted">{data?.currentPayrun ? `Based on ${data.currentPayrun.name}` : "Payroll overview"}</p></div></header>
    <form className="toolbar dashboard-filters" onSubmit={apply}>
      <label>Period from<input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /></label>
      <label>Period to<input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /></label>
      <label>Department<select value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })}><option value="">All departments</option>{departments.map((department) => <option key={department}>{department}</option>)}</select></label>
      <label>Employee Type<select value={filters.employeeType} onChange={(event) => setFilters({ ...filters, employeeType: event.target.value })}><option value="">All employee types</option>{employeeTypes.map((employeeType) => <option key={employeeType}>{employeeType}</option>)}</select></label>
      <label>Company<select value={filters.company} onChange={(event) => setFilters({ ...filters, company: event.target.value })}><option value="">All companies</option>{companies.map((company) => <option key={company}>{company}</option>)}</select></label>
      <button type="submit">Apply</button>
    </form>
    {error && <p className="error">{error}</p>}
    {!data ? <p>Loading payroll analytics…</p> : <>
      <section className="dashboard-grid"><div className="panel-card"><p className="eyebrow">Total Net Salary Paid</p><h2>{money(data.kpis.totalNetSalaryPaid)}</h2><small>Based on current payrun</small></div><div className="panel-card"><p className="eyebrow">Payslips Generated</p><h2>{data.kpis.payslipsGenerated}</h2><small>Based on current payrun</small></div><div className="panel-card"><p className="eyebrow">Avg Salary / Employee</p><h2>{money(data.kpis.avgSalaryPerEmployee)}</h2><small>Based on current payrun</small></div></section>
      <section className="dashboard-charts"><div className="panel-card"><p className="eyebrow">Salary Cost by Department</p><h2>Salary Cost by Department</h2><div className="dashboard-bars">{data.departmentCosts.map((row) => <div key={row.department}><div><span>{row.department}</span><strong>{money(row.total)}</strong></div><span><i style={{ width: `${(row.total / highestDepartment) * 100}%` }} /></span></div>)}{!data.departmentCosts.length && <p className="muted">No payroll data for these filters.</p>}</div></div>
        <div className="panel-card"><p className="eyebrow">Monthly Net Salary Trend</p><h2>Monthly Net Salary Trend</h2><div className="dashboard-trend">{data.monthlyNetSalaryTrend.map((row) => <div key={row.label}><i title={`${row.label}: ${money(row.total)}`} style={{ height: `${Math.max((row.total / highestMonth) * 100, 4)}%` }} /><small>{row.label}</small></div>)}{!data.monthlyNetSalaryTrend.length && <p className="muted">No payroll data for these filters.</p>}</div></div>
        <div className="panel-card dashboard-alerts"><p className="eyebrow">Payslip Status & Payroll Alerts</p><h2>Payslip Status & Payroll Alerts</h2><ul>{data.statusCounts.map((item) => <li key={item.status}>{item.count} payslip{item.count === 1 ? "" : "s"} {item.status}</li>)}{data.warningCounts.map((item) => <li key={item.warning}>{item.count} {item.warning} warning{item.count === 1 ? "" : "s"}</li>)}{!data.statusCounts.length && !data.warningCounts.length && <li>No payroll alerts for these filters.</li>}</ul></div></section>
    </>}
  </main>;
}
