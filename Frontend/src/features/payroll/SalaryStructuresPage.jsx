import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { PAYROLL_MANAGER_ROLES, canAccess } from "../../common/utils/roles";
import { createSalaryStructure, deleteSalaryStructure, getSalaryStructures, updateSalaryStructure } from "./payrollApi";

const DEFAULT_FORMULA = [
  "BASIC = contractWage",
  "GROSS = BASIC",
  "DEDUCTIONS = 0",
  "NET = GROSS - DEDUCTIONS",
].join(";\n");

const blankStructure = { name: "", description: "", mathematicalFormula: DEFAULT_FORMULA };

export default function SalaryStructuresPage() {
	const { user } = useAuth();
	const canManageStructures = canAccess(user, PAYROLL_MANAGER_ROLES);
  const [structures, setStructures] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blankStructure);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const load = async () => {
    try {
      setStructures(await getSalaryStructures());
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => { load(); }, []);

  const openEditor = (structure = null) => {
    setSelected(structure);
    setForm(structure ? {
      name: structure.name,
      description: structure.description || "",
      mathematicalFormula: structure.mathematicalFormula || DEFAULT_FORMULA,
    } : { ...blankStructure });
    setError("");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
    setError("");
  };

  const save = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await (selected
        ? updateSalaryStructure(selected._id, form)
        : createSalaryStructure(form));
      await load();
      setEditorOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm(`Delete ${selected.name}?`)) return;
    try {
      await deleteSalaryStructure(selected._id);
      setSelected(null);
      setForm({ ...blankStructure });
      setEditorOpen(false);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <main className="app-shell payroll-screen salary-structures-page">
    <header className="page-header"><div><p className="eyebrow">PeoplePay360 / Payroll</p><h1>Salary Structures</h1><p className="muted">Define reusable payroll calculations in one clear formula.</p></div>{canManageStructures && <div className="page-actions"><button type="button" onClick={() => openEditor()}>NEW STRUCTURE</button></div>}</header>
    {error && !editorOpen && <p className="error">{error}</p>}
    <section className="table-wrap salary-structures-list" aria-label="Salary structures">
      <div className="structures-list-heading"><div><h2>Structures</h2><p className="muted">Select a structure to review or edit its formula.</p></div><span className="structures-count">{structures.length} {structures.length === 1 ? "structure" : "structures"}</span></div>
      <table><thead><tr><th>Name</th><th>Description</th><th>Formula</th></tr></thead><tbody>
        {structures.map((structure) => <tr className={selected?._id === structure._id ? "selected-row attendance-row" : "attendance-row"} key={structure._id} onClick={canManageStructures ? () => openEditor(structure) : undefined}><td><strong>{structure.name}</strong></td><td>{structure.description || "—"}</td><td><code className="formula-preview" title={structure.mathematicalFormula}>{structure.mathematicalFormula}</code></td></tr>)}
        {!structures.length && <tr><td colSpan="3" className="empty-state">No salary structures configured. Create one to define a payroll calculation.</td></tr>}
      </tbody></table>
    </section>

    {editorOpen && <div className="modal" role="dialog" aria-modal="true" aria-labelledby="salary-structure-editor-title" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
      <form className="modal-card salary-structure-modal" onSubmit={save}>
        <header className="salary-structure-modal-header"><div><p className="eyebrow">Payroll structure</p><h2 id="salary-structure-editor-title">{selected ? "Edit salary structure" : "New salary structure"}</h2><p className="muted">Set the formula that will calculate each employee’s payslip.</p></div><button className="modal-dismiss" type="button" onClick={closeEditor} aria-label="Close salary structure editor">×</button></header>
        <div className="salary-structure-modal-body">
          {error && <p className="error">{error}</p>}
          <div className="structure-editor-grid">
            <div>
              <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Standard monthly payroll" required /></label>
              <label>Description<textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Briefly describe when this structure is used." /></label>
              <label className="formula-field">Mathematical Formula<textarea className="payroll-formula-input" rows="9" value={form.mathematicalFormula} onChange={(event) => setForm({ ...form, mathematicalFormula: event.target.value })} required /></label>
            </div>
            <aside className="formula-reference" aria-label="Formula reference"><p className="eyebrow">Formula reference</p><h3>Available values</h3><dl><div><dt><code>contractWage</code></dt><dd>Monthly wage from the employee contract.</dd></div><div><dt><code>workedDays</code></dt><dd>Closed attendance days in the payrun period.</dd></div><div><dt><code>expectedWorkingDays</code></dt><dd>Working days from the assigned schedule, or a visible weekday estimate.</dd></div><div><dt><code>paidLeaveDays</code></dt><dd>Approved leave days backed by an allocation.</dd></div><div><dt><code>unpaidLeaveDays</code></dt><dd>Approved leave days without an allocation.</dd></div></dl><div className="formula-outputs"><strong>Required totals</strong><span><code>BASIC</code>, <code>GROSS</code>, <code>DEDUCTIONS</code>, <code>NET</code></span></div><div className="formula-example"><span>Example</span><code>BASIC = contractWage; LOP = expectedWorkingDays &gt; 0 ? (BASIC / expectedWorkingDays) * unpaidLeaveDays : 0; DEDUCTIONS = LOP; NET = BASIC - DEDUCTIONS</code></div></aside>
          </div>
          <footer className="salary-structure-modal-actions">{selected && <button className="secondary" type="button" onClick={remove}>Delete</button>}<div><button className="secondary" type="button" onClick={closeEditor}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving…" : selected ? "Save Changes" : "Create Structure"}</button></div></footer>
        </div>
      </form>
    </div>}
  </main>;
}
