import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPayrunDraft, getPayruns, getSalaryStructures, setPayrunEmployees } from "./payrollApi";

const formatPeriod = (period) => `${new Date(period.startDate).toLocaleDateString()} – ${new Date(period.endDate).toLocaleDateString()}`;
const payrunName = (startDate) => startDate
  ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(`${startDate}T00:00:00`))
  : "";
const badgeClass = (status) => ({ paid: "active", validated: "approved", computed: "pending", draft: "closed" }[status] || "closed");

function PayrunWizard({ structures, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ salaryStructureId: "", startDate: "", endDate: "" });
  const [draft, setDraft] = useState(null);
  const [eligible, setEligible] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const continueToEmployees = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = await createPayrunDraft({
        name: payrunName(form.startDate),
        salaryStructureId: form.salaryStructureId,
        period: { startDate: form.startDate, endDate: form.endDate },
      });
      setDraft(data.payrun);
      setEligible(data.eligibleEmployees);
      setSelectedIds(data.eligibleEmployees.map((employee) => employee._id));
      setStep(2);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const createPayrun = async () => {
    setError("");
    setSaving(true);
    try {
      const payrun = await setPayrunEmployees(draft._id, selectedIds);
      onCreated(payrun);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredEligible = eligible.filter((employee) => employee.name.toLowerCase().includes(query.toLowerCase()));
  const toggle = (id) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);

  return <div className="modal" role="dialog" aria-modal="true" aria-label="New payrun">
    <div className="modal-card payroll-wizard">
      <p className="eyebrow">New payrun · Step {step} of 2</p>
      <h2>{step === 1 ? "Choose the payrun scope" : "Select Employee Records"}</h2>
      {step === 1 ? <form onSubmit={continueToEmployees}>
        <label>
          Pay Structure
          <select value={form.salaryStructureId} onChange={(event) => setForm({ ...form, salaryStructureId: event.target.value })} required>
            <option value="">Select a structure</option>
            {structures.filter((structure) => structure.isActive).map((structure) => <option key={structure._id} value={structure._id}>{structure.name}</option>)}
          </select>
        </label>
        <div className="detail-grid payroll-date-grid">
          <label>Period start<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></label>
          <label>Period end<input type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required /></label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions payroll-wizard-actions"><button className="secondary" type="button" onClick={onClose}>Discard</button><button type="submit" disabled={saving}>Continue</button></div>
      </form> : <>
        <p className="muted">{payrunName(form.startDate)} · {eligible.length} eligible employee{eligible.length === 1 ? "" : "s"}</p>
        <div className="toolbar"><input placeholder="Search employee records…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="table-wrap payroll-selection-table"><table>
          <thead><tr><th><input aria-label="Select all employees" type="checkbox" checked={filteredEligible.length > 0 && filteredEligible.every((employee) => selectedIds.includes(employee._id))} onChange={(event) => setSelectedIds(event.target.checked ? eligible.map((employee) => employee._id) : [])} /></th><th>Employee</th><th>Working Hours</th><th>Start Date</th><th>Wage</th></tr></thead>
          <tbody>{filteredEligible.map((employee) => <tr key={employee._id}><td><input aria-label={`Select ${employee.name}`} type="checkbox" checked={selectedIds.includes(employee._id)} onChange={() => toggle(employee._id)} /></td><td>{employee.name}<small>{employee.department || "No department"}</small></td><td>{employee.workingHours}</td><td>{new Date(employee.startDate).toLocaleDateString()}</td><td>{Number(employee.wage).toLocaleString()}</td></tr>)}
          {!filteredEligible.length && <tr><td colSpan="5" className="empty-state">No eligible employees — check that at least one employee has a Running contract covering this period.</td></tr>}</tbody>
        </table></div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions payroll-wizard-actions"><button className="secondary" type="button" onClick={() => setStep(1)}>Back</button><button type="button" onClick={createPayrun} disabled={saving || !selectedIds.length}>Create Payrun</button></div>
      </>}
    </div>
  </div>;
}

export default function PayrunsListPage() {
  const navigate = useNavigate();
  const [payruns, setPayruns] = useState([]);
  const [structures, setStructures] = useState([]);
  const [query, setQuery] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [loadedPayruns, loadedStructures] = await Promise.all([getPayruns(), getSalaryStructures()]);
      setPayruns(loadedPayruns);
      setStructures(loadedStructures);
    } catch (requestError) { setError(requestError.message); }
  };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => payruns.filter((payrun) => `${payrun.name} ${formatPeriod(payrun.period)}`.toLowerCase().includes(query.toLowerCase())), [payruns, query]);

  return <main className="app-shell payroll-screen">
    <header className="page-header"><div><p className="eyebrow">PeoplePay360 / Payroll</p><h1>Payruns</h1></div><div className="page-actions"><button type="button" onClick={() => setShowWizard(true)}>NEW</button></div></header>
    <div className="toolbar"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payruns…" /></div>
    {error && <p className="error">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Period</th><th>Employee count</th><th>Status</th><th>Warning count</th></tr></thead>
      <tbody>{filtered.map((payrun) => <tr className="attendance-row" key={payrun._id} onClick={() => navigate(`/payroll/payruns/${payrun._id}`)}><td>{payrun.name}</td><td>{formatPeriod(payrun.period)}</td><td>{payrun.employees?.length || 0}</td><td><span className={`status ${badgeClass(payrun.status)}`}>{payrun.status}</span></td><td>{payrun.warnings?.length ? `${payrun.warnings.length} warning${payrun.warnings.length === 1 ? "" : "s"}` : "No warnings"}</td></tr>)}
      {!filtered.length && <tr><td colSpan="5" className="empty-state">No payruns yet. Create one to begin payroll.</td></tr>}</tbody></table></div>
    {showWizard && <PayrunWizard structures={structures} onClose={() => setShowWizard(false)} onCreated={(payrun) => navigate(`/payroll/payruns/${payrun._id}`)} />}
  </main>;
}
