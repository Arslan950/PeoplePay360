import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { computePayrun, getPayrun, markPayrunPaid, payslipPdfUrl, sendPayrunPayslips, validatePayrun } from "./payrollApi";

const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const periodLabel = (period) => `${new Date(period.startDate).toLocaleDateString()} – ${new Date(period.endDate).toLocaleDateString()}`;
const badgeClass = (status) => ({ paid: "active", validated: "approved", computed: "pending", draft: "closed" }[status] || "closed");

export default function PayrunDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState("");
  const load = async () => { try { setData(await getPayrun(id)); } catch (requestError) { setError(requestError.message); } };
  useEffect(() => { load(); }, [id]);

  const action = async (kind) => {
    if (!data) return;
    if (kind === "validate" && data.payrun.warnings?.length && !window.confirm(`This payrun has ${data.payrun.warnings.length} warning(s). Validate anyway?`)) return;
    setError(""); setNotice(""); setWorking(kind);
    try {
      const result = kind === "compute" ? await computePayrun(id)
        : kind === "validate" ? await validatePayrun(id)
          : kind === "paid" ? await markPayrunPaid(id)
            : await sendPayrunPayslips(id);
      if (kind === "send") setNotice(`${result.sent.length} payslip(s) sent${result.failed.length ? `; ${result.failed.length} failed` : ""}.`);
      else { setNotice(kind === "compute" && result.skipped?.length ? `${result.skipped.length} employee(s) skipped because no running contract was found.` : "Payrun updated."); await load(); }
    } catch (requestError) { setError(requestError.message); }
    finally { setWorking(""); }
  };

  if (!data && !error) return <main className="app-shell"><p>Loading payrun…</p></main>;
  if (!data) return <main className="app-shell"><p className="error">{error}</p></main>;
  const { payrun, payslips } = data;

  return <main className="app-shell payroll-screen">
    <header className="page-header"><div><p className="eyebrow">Payrun / {payrun.name}</p><h1>{payrun.name}</h1><p className="muted">Open one Payrun to compute and manage its payslips.</p></div><div className="page-actions"><button type="button" className="secondary" onClick={() => navigate(-1)}>Back</button></div></header>
    <section className="payrun-overview panel-card">
      <div className="payrun-overview-head"><div><strong>{periodLabel(payrun.period)}</strong><small>{payrun.salaryStructure?.name || "Salary structure unavailable"}</small></div><span className={`status ${badgeClass(payrun.status)}`}>{payrun.status}</span></div>
      {payrun.warnings?.length > 0 && <div className="payroll-warning"><strong>Warnings to review</strong><ul>{payrun.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}
      <div className="smart-buttons-bar payrun-actions">
        {payrun.status === "draft" && <button type="button" onClick={() => action("compute")} disabled={Boolean(working)}>{working === "compute" ? "Computing…" : "Compute"}</button>}
        {payrun.status === "computed" && <><button type="button" className="secondary" onClick={() => action("compute")} disabled={Boolean(working)}>Recompute</button><button type="button" onClick={() => action("validate")} disabled={Boolean(working)}>{working === "validate" ? "Validating…" : "Validate"}</button></>}
        {payrun.status === "validated" && <button type="button" onClick={() => action("paid")} disabled={Boolean(working)}>{working === "paid" ? "Marking…" : "Mark Paid"}</button>}
        {['validated', 'paid'].includes(payrun.status) && <button type="button" className="secondary" onClick={() => action("send")} disabled={Boolean(working)}>{working === "send" ? "Sending…" : "SEND PAYSLIPS"}</button>}
      </div>
      {error && <p className="error">{error}</p>}{notice && <p className="success-message">{notice}</p>}
    </section>
    <div className="table-wrap payroll-payslip-table"><table><thead><tr><th>Employee</th><th>Warning</th><th>Worked</th><th>Basic</th><th>Gross</th><th>Net</th><th>Status</th><th>PDF</th></tr></thead>
      <tbody>{payslips.map((payslip) => <tr key={payslip._id}><td><button type="button" className="link-button" onClick={() => navigate(`/payroll/payslips/${payslip._id}`)}>{payslip.employee?.name || "Unknown employee"}</button></td><td>{payslip.warning ? <span className="status refused">{payslip.warning}</span> : "—"}</td><td>{payslip.workedDays}</td><td>{money(payslip.basicSalary)}</td><td>{money(payslip.grossSalary)}</td><td><strong>{money(payslip.netSalary)}</strong></td><td><span className={`status ${badgeClass(payslip.status)}`}>{payslip.status}</span></td><td><a className="link-button" href={payslipPdfUrl(payslip._id)} target="_blank" rel="noreferrer">PDF</a></td></tr>)}
      {!payslips.length && <tr><td colSpan="8" className="empty-state">Compute this payrun to generate its payslips.</td></tr>}</tbody></table></div>
  </main>;
}
