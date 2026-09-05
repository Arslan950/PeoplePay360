import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPayslip, payslipPdfUrl } from "./payrollApi";

const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const periodLabel = (period) => `${new Date(period.startDate).toLocaleDateString()} – ${new Date(period.endDate).toLocaleDateString()}`;
const badgeClass = (status) => ({ paid: "active", validated: "approved", computed: "pending", draft: "closed" }[status] || "closed");

export default function PayslipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payslip, setPayslip] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { getPayslip(id).then(setPayslip).catch((requestError) => setError(requestError.message)); }, [id]);
  if (!payslip && !error) return <main className="app-shell"><p>Loading payslip…</p></main>;
  if (!payslip) return <main className="app-shell"><p className="error">{error}</p></main>;
  const structure = payslip.payrun?.salaryStructure?.name || "—";

  return <main className="app-shell">
    <header className="page-header"><div><p className="eyebrow">Payslip / {payslip.employee?.name} / {periodLabel(payslip.period)}</p><h1>Payslip</h1><p className="muted">Detailed salary computation for one employee.</p></div><div className="page-actions"><a className="button-link" href={payslipPdfUrl(payslip._id)} target="_blank" rel="noreferrer">PRINT PAYSLIP</a><button type="button" className="secondary" onClick={() => navigate(-1)}>Back</button></div></header>
    <section className="form-card payslip-detail-card">
      <div className="detail-grid">
        <div className="detail-field"><span>Employee</span><strong>{payslip.employee?.name || "—"}</strong></div>
        <div className="detail-field"><span>Salary Structure</span><strong>{structure}</strong></div>
        <div className="detail-field"><span>Pay Run</span><strong>{payslip.payrun?.name || "—"}</strong></div>
        <div className="detail-field"><span>Period</span><strong>{periodLabel(payslip.period)}</strong></div>
        <div className="detail-field"><span>Status</span><strong><span className={`status ${badgeClass(payslip.status)}`}>{payslip.status}</span></strong></div>
        <div className="detail-field"><span>Worked Days</span><strong>{payslip.workedDays}</strong></div>
      </div>
      {payslip.warning && <p className="payroll-warning inline-warning">Warning: {payslip.warning}</p>}
      <h2>Salary Computation</h2>
      <div className="table-wrap"><table><thead><tr><th>Rule</th><th>Code</th><th>Category</th><th>Amount</th></tr></thead><tbody>{payslip.lines.map((line) => <tr key={`${payslip._id}-${line.code}`} className={line.category === "net" ? "net-line" : ""}><td>{line.name}</td><td>{line.code}</td><td>{line.category}</td><td>{money(line.amount)}</td></tr>)}</tbody></table></div>
      <div className="payslip-totals"><span>Basic: <strong>{money(payslip.basicSalary)}</strong></span><span>Gross: <strong>{money(payslip.grossSalary)}</strong></span><span>Deductions: <strong>{money(payslip.totalDeductions)}</strong></span><span>Net: <strong>{money(payslip.netSalary)}</strong></span></div>
    </section>
  </main>;
}
