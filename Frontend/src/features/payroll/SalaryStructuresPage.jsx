import { useEffect, useMemo, useState } from "react";
import { createSalaryStructure, deleteSalaryStructure, getSalaryRules, getSalaryStructures, updateSalaryStructure } from "./payrollApi";

const blankStructure = { name: "", description: "", isActive: true };

export default function SalaryStructuresPage() {
  const [structures, setStructures] = useState([]);
  const [rules, setRules] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blankStructure);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = async () => { try { const [loadedStructures, loadedRules] = await Promise.all([getSalaryStructures(), getSalaryRules()]); setStructures(loadedStructures); setRules(loadedRules); } catch (requestError) { setError(requestError.message); } };
  useEffect(() => { load(); }, []);
  const select = (structure) => { setSelected(structure); setForm({ name: structure.name, description: structure.description || "", isActive: structure.isActive !== false }); setError(""); };
  const selectedRules = useMemo(() => rules.filter((rule) => (rule.salaryStructure?._id || rule.salaryStructure) === selected?._id).sort((a, b) => a.sequence - b.sequence), [rules, selected]);
  const save = async (event) => {
    event.preventDefault(); setError(""); setSaving(true);
    try { const saved = selected ? await updateSalaryStructure(selected._id, form) : await createSalaryStructure(form); await load(); select(saved); }
    catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!selected || !window.confirm(`Delete ${selected.name}?`)) return;
    try { await deleteSalaryStructure(selected._id); setSelected(null); setForm(blankStructure); await load(); } catch (requestError) { setError(requestError.message); }
  };

  return <main className="app-shell payroll-screen">
    <header className="page-header"><div><p className="eyebrow">PeoplePay360 / Payroll</p><h1>Salary Structures</h1></div><div className="page-actions"><button type="button" onClick={() => { setSelected(null); setForm(blankStructure); setError(""); }}>NEW</button></div></header>
    {error && <p className="error">{error}</p>}
    <div className="payroll-config-grid"><section className="table-wrap"><table><thead><tr><th>Name</th><th>Description</th><th>Rule count</th></tr></thead><tbody>{structures.map((structure) => <tr className={selected?._id === structure._id ? "selected-row" : "attendance-row"} key={structure._id} onClick={() => select(structure)}><td>{structure.name}{structure.isActive === false && <small>Inactive</small>}</td><td>{structure.description || "—"}</td><td>{structure.ruleCount || 0}</td></tr>)}{!structures.length && <tr><td colSpan="3" className="empty-state">No salary structures configured.</td></tr>}</tbody></table></section>
      <form className="form-card payroll-config-form" onSubmit={save}><p className="eyebrow">{selected ? "Edit structure" : "New structure"}</p><h2>{selected ? selected.name : "Structure Details"}</h2><label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Description<textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Active</label>
        {selected && <div className="structure-rules"><strong>Rules in this structure</strong>{selectedRules.length ? <ul>{selectedRules.map((rule) => <li key={rule._id}><code>{rule.code}</code> {rule.name} <small>Sequence {rule.sequence}</small></li>)}</ul> : <p className="muted">No rules reference this structure yet.</p>}</div>}
        <div className="form-actions"><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>{selected && <button className="secondary" type="button" onClick={remove}>Delete</button>}</div>
      </form></div>
  </main>;
}
