import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPayslips } from "./payrollApi";

const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const periodLabel = (period) => `${new Date(period.startDate).toLocaleDateString()} – ${new Date(period.endDate).toLocaleDateString()}`;
const badgeClass = (status) => ({ paid: "active", validated: "approved", computed: "pending", draft: "closed" }[status] || "closed");

export default function PayslipsListPage() {
  const navigate = useNavigate();
  const [payslips, setPayslips] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { getPayslips().then(setPayslips).catch((requestError) => setError(requestError.message)); }, []);
  const filtered = useMemo(() => payslips.filter((payslip) => `${payslip.employee?.name || ""} ${periodLabel(payslip.period)} ${payslip.payrun?.salaryStructure?.name || ""}`.toLowerCase().includes(query.toLowerCase())), [payslips, query]);

  return <main className="app-shell">
    <header className="page-header"><div><p className="eyebrow">PeoplePay360 / Payroll</p><h1>Payslips</h1></div></header>
    <div className="toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payslips…" /></div>
    {error && <p className="error">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Warning</th><th>Period</th><th>Basic</th><th>Gross</th><th>Net</th><th>Structure</th><th>Status</th></tr></thead>
      <tbody>{filtered.map((payslip) => <tr className="attendance-row" key={payslip._id} onClick={() => navigate(`/payroll/payslips/${payslip._id}`)}><td>{payslip.employee?.name || "Unknown employee"}</td><td>{payslip.warning ? <span className="status refused">{payslip.warning}</span> : "—"}</td><td>{periodLabel(payslip.period)}</td><td>{money(payslip.basicSalary)}</td><td>{money(payslip.grossSalary)}</td><td><strong>{money(payslip.netSalary)}</strong></td><td>{payslip.payrun?.salaryStructure?.name || "—"}</td><td><span className={`status ${badgeClass(payslip.status)}`}>{payslip.status}</span></td></tr>)}
      {!filtered.length && <tr><td colSpan="8" className="empty-state">No payslips found.</td></tr>}</tbody></table></div>
  </main>;
}
