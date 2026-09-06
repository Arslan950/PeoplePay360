import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiRequest } from "../../common/utils/api";
import { getEmployees } from "../employees/employeeApi";

const money = (value) => Number(value || 0).toLocaleString(undefined, {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const number = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const statusColors = ["#5fa2fa", "#8cc3ff", "#607eae", "#3a4d70", "#f0b86e"];

function EmptyChart({ children }) {
  return <p className="dashboard-empty muted">{children}</p>;
}

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
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    load();
    getEmployees().then(setEmployees).catch(() => undefined);
  }, []);

  const departments = useMemo(() => [...new Set(employees.map((employee) => employee.department).filter(Boolean))].sort(), [employees]);
  const employeeTypes = useMemo(() => [...new Set(employees.map((employee) => employee.employeeType).filter(Boolean))].sort(), [employees]);
  const companies = useMemo(() => [...new Set(employees.map((employee) => employee.company).filter(Boolean))].sort(), [employees]);
  const apply = (event) => {
    event.preventDefault();
    load();
  };
  const setFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const kpis = data?.kpis || {};
  const attendance = data?.attendanceOverview || {};

  return <main className="app-shell dashboard-page">
    <header className="page-header dashboard-page-header">
      <div>
        <p className="eyebrow">PeoplePay360 / Dashboard</p>
        <h1>Payroll dashboard</h1>
        <p className="muted">{data?.currentPayrun ? `Based on ${data.currentPayrun.name}` : "A connected view of payroll, attendance, time off, and cost."}</p>
      </div>
    </header>

    <form className="dashboard-filters" onSubmit={apply}>
      <label>Period from
        <input type="date" value={filters.startDate} onChange={(event) => setFilter("startDate", event.target.value)} />
      </label>
      <label>Period to
        <input type="date" value={filters.endDate} onChange={(event) => setFilter("endDate", event.target.value)} />
      </label>
      <label>Department
        <select value={filters.department} onChange={(event) => setFilter("department", event.target.value)}>
          <option value="">All departments</option>
          {departments.map((department) => <option key={department}>{department}</option>)}
        </select>
      </label>
      <label>Employee type
        <select value={filters.employeeType} onChange={(event) => setFilter("employeeType", event.target.value)}>
          <option value="">All employee types</option>
          {employeeTypes.map((employeeType) => <option key={employeeType}>{employeeType}</option>)}
        </select>
      </label>
      <label>Company
        <select value={filters.company} onChange={(event) => setFilter("company", event.target.value)}>
          <option value="">All companies</option>
          {companies.map((company) => <option key={company}>{company}</option>)}
        </select>
      </label>
      <button type="submit">Apply filters</button>
    </form>

    {error && <p className="error">{error}</p>}
    {!data ? <p className="dashboard-loading">Loading payroll analytics…</p> : <>
      <section className="dashboard-kpi-grid" aria-label="Payroll key performance indicators">
        <article className="panel-card dashboard-kpi-card"><p className="eyebrow">Total net salary paid</p><strong>{money(kpis.totalNetSalaryPaid)}</strong><small>Payroll paid in the selected period</small></article>
        <article className="panel-card dashboard-kpi-card"><p className="eyebrow">Payslips generated</p><strong>{number(kpis.payslipsGenerated)}</strong><small>Across the current filtered workforce</small></article>
        <article className="panel-card dashboard-kpi-card"><p className="eyebrow">Avg salary / employee</p><strong>{money(kpis.avgSalaryPerEmployee)}</strong><small>Average net payroll amount</small></article>
        <article className="panel-card dashboard-kpi-card"><p className="eyebrow">Approved time off days</p><strong>{number(kpis.approvedTimeOffDays)}</strong><small>Approved leave overlapping this period</small></article>
        <article className="panel-card dashboard-kpi-card"><p className="eyebrow">Attendance health</p><strong>{number(kpis.attendanceHealth)}%</strong><small>Present days as a share of scheduled days</small></article>
      </section>

      <section className="dashboard-chart-grid" aria-label="Payroll charts">
        <article className="panel-card dashboard-chart-card">
          <div className="dashboard-panel-heading"><div><p className="eyebrow">Payroll cost</p><h2>Salary Cost by Department</h2></div><span>Historical net pay</span></div>
          {data.departmentCosts.length ? <div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.departmentCosts} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="#2a3854" /><XAxis dataKey="department" tick={{ fill: "#aebbd0", fontSize: 12 }} tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: "#aebbd0", fontSize: 12 }} tickLine={false} axisLine={false} width={42} /><Tooltip formatter={(value) => money(value)} cursor={{ fill: "rgba(95, 162, 250, .10)" }} /><Bar dataKey="total" name="Net salary" fill="#5fa2fa" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <EmptyChart>No payroll data for these filters.</EmptyChart>}
        </article>

        <article className="panel-card dashboard-chart-card">
          <div className="dashboard-panel-heading"><div><p className="eyebrow">Payroll trend</p><h2>Monthly Net Salary Trend</h2></div><span>Historical net pay</span></div>
          {data.monthlyNetSalaryTrend.length ? <div className="dashboard-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.monthlyNetSalaryTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="#2a3854" /><XAxis dataKey="label" tick={{ fill: "#aebbd0", fontSize: 12 }} tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fill: "#aebbd0", fontSize: 12 }} tickLine={false} axisLine={false} width={42} /><Tooltip formatter={(value) => money(value)} /><Line type="monotone" dataKey="total" name="Net salary" stroke="#5fa2fa" strokeWidth={3} dot={{ r: 3, fill: "#5fa2fa" }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div> : <EmptyChart>No payroll data for these filters.</EmptyChart>}
        </article>

        <article className="panel-card dashboard-chart-card dashboard-alert-card">
          <div className="dashboard-panel-heading"><div><p className="eyebrow">Status and alerts</p><h2>Payslip Status & Payroll Alerts</h2></div></div>
          {data.statusCounts.length ? <div className="dashboard-pie-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.statusCounts} dataKey="count" nameKey="status" innerRadius={44} outerRadius={70} paddingAngle={3}>{data.statusCounts.map((entry, index) => <Cell key={entry.status} fill={statusColors[index % statusColors.length]} />)}</Pie><Tooltip formatter={(value, name) => [`${value} payslip${value === 1 ? "" : "s"}`, name]} /><Legend iconType="circle" iconSize={8} /></PieChart></ResponsiveContainer></div> : <EmptyChart>No payslip statuses for these filters.</EmptyChart>}
          <ul className="dashboard-alert-list">
            {data.alerts.map((alert) => <li key={alert}>{alert}</li>)}
            {!data.alerts.length && <li className="muted">No payroll alerts for these filters.</li>}
          </ul>
        </article>
      </section>

      <section className="dashboard-overview-grid" aria-label="Workforce overview">
        <article className="panel-card dashboard-overview-card">
          <div className="dashboard-panel-heading"><div><p className="eyebrow">Attendance overview</p><h2>Daily workforce signals</h2></div></div>
          <div className="attendance-stat-grid">
            <div><span>Present</span><strong>{number(attendance.presentCount)}</strong></div>
            <div><span>Late</span><strong>{number(attendance.lateCount)}</strong></div>
            <div><span>Absent</span><strong>{number(attendance.absentCount)}</strong></div>
            <div><span>Overtime</span><strong>{number(attendance.overtimeCount)}</strong></div>
          </div>
          <dl className="attendance-footnotes">
            <div><dt>Missing check-outs</dt><dd>{number(attendance.missingCheckouts)}</dd></div>
            <div><dt>Manual edits</dt><dd>{number(attendance.manualEdits)}</dd></div>
            <div><dt>Coverage</dt><dd>{number(attendance.attendanceCoverage)}%</dd></div>
          </dl>
        </article>

        <article className="panel-card dashboard-overview-card">
          <div className="dashboard-panel-heading"><div><p className="eyebrow">Time off overview</p><h2>Leave balances and requests</h2></div></div>
          <div className="table-wrap dashboard-table-wrap"><table><thead><tr><th>Type</th><th>Approved days</th><th>Pending</th><th>Remaining balance</th></tr></thead><tbody>
            {data.timeoffOverview.map((row) => <tr key={row.type}><td>{row.type}</td><td>{number(row.approvedDays)}</td><td>{number(row.pendingCount)}</td><td>{row.remainingBalance === "N/A" ? "N/A" : number(row.remainingBalance)}</td></tr>)}
            {!data.timeoffOverview.length && <tr><td colSpan="4" className="dashboard-table-empty">No active time-off types.</td></tr>}
          </tbody></table></div>
        </article>

        <article className="panel-card dashboard-overview-card">
          <div className="dashboard-panel-heading"><div><p className="eyebrow">Department overview</p><h2>Current salary run-rate</h2></div></div>
          <div className="table-wrap dashboard-table-wrap"><table><thead><tr><th>Department</th><th>Headcount</th><th>Monthly salary</th></tr></thead><tbody>
            {data.departmentOverview.map((row) => <tr key={row.department}><td>{row.department}</td><td>{number(row.headcount)}</td><td>{money(row.monthlySalary)}</td></tr>)}
            {!data.departmentOverview.length && <tr><td colSpan="3" className="dashboard-table-empty">No active employees for these filters.</td></tr>}
          </tbody></table></div>
        </article>
      </section>
    </>}
  </main>;
}
