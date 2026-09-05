import { useEffect, useState } from "react";
import { createSalaryRule, deleteSalaryRule, getSalaryRules, getSalaryStructures, updateSalaryRule } from "./payrollApi";

const blankRule = {
  name: "", code: "", category: "basic", salaryStructure: "", sequence: 10, computationType: "fixed",
  fixedAmount: 0, percentageBase: "contract_wage", percentageValue: 0, formulaExpression: "", isActive: true,
};

export default function SalaryRulesPage() {
  const [rules, setRules] = useState([]);
  const [structures, setStructures] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blankRule);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = async () => { try { const [loadedRules, loadedStructures] = await Promise.all([getSalaryRules(), getSalaryStructures()]); setRules(loadedRules); setStructures(loadedStructures); } catch (requestError) { setError(requestError.message); } };
  useEffect(() => { load(); }, []);
  const select = (rule) => { setSelected(rule); setForm({ ...blankRule, ...rule, salaryStructure: rule.salaryStructure?._id || rule.salaryStructure }); setError(""); };
  const save = async (event) => {
    event.preventDefault(); setError(""); setSaving(true);
    const payload = { ...form, code: form.code.toUpperCase(), sequence: Number(form.sequence), fixedAmount: Number(form.fixedAmount), percentageValue: Number(form.percentageValue) };
    try { const saved = selected ? await updateSalaryRule(selected._id, payload) : await createSalaryRule(payload); await load(); select(saved); }
    catch (requestError) { setError(requestError.message); } finally { setSaving(false); }
  };
  const remove = async () => { if (!selected || !window.confirm(`Delete ${selected.name}?`)) return; try { await deleteSalaryRule(selected._id); setSelected(null); setForm(blankRule); await load(); } catch (requestError) { setError(requestError.message); } };

  return <main className="app-shell">
    <header className="page-header"><div><p className="eyebrow">PeoplePay360 / Payroll</p><h1>Salary Rules</h1></div><div className="page-actions"><button type="button" onClick={() => { setSelected(null); setForm(blankRule); setError(""); }}>NEW</button></div></header>
    {error && <p className="error">{error}</p>}
    <div className="payroll-config-grid"><section className="table-wrap"><table><thead><tr><th>Name</th><th>Code</th><th>Category</th><th>Structure</th><th>Sequence</th></tr></thead><tbody>{rules.map((rule) => <tr key={rule._id} className={selected?._id === rule._id ? "selected-row" : "attendance-row"} onClick={() => select(rule)}><td>{rule.name}{rule.isActive === false && <small>Inactive</small>}</td><td><code>{rule.code}</code></td><td>{rule.category}</td><td>{rule.salaryStructure?.name || "—"}</td><td>{rule.sequence}</td></tr>)}{!rules.length && <tr><td colSpan="5" className="empty-state">No salary rules configured.</td></tr>}</tbody></table></section>
      <form className="form-card payroll-config-form" onSubmit={save}><p className="eyebrow">{selected ? "Edit rule" : "New rule"}</p><h2>{selected ? selected.name : "Rule Details"}</h2><label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Code<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} required /></label>
        <div className="detail-grid payroll-rule-grid"><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{["basic", "allowance", "deduction", "gross", "net"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Salary Structure<select value={form.salaryStructure || ""} onChange={(event) => setForm({ ...form, salaryStructure: event.target.value })} required><option value="">Select structure</option>{structures.map((structure) => <option key={structure._id} value={structure._id}>{structure.name}</option>)}</select></label><label>Sequence<input type="number" min="0" value={form.sequence} onChange={(event) => setForm({ ...form, sequence: event.target.value })} required /></label><label>Computation Type<select value={form.computationType} onChange={(event) => setForm({ ...form, computationType: event.target.value })}><option value="fixed">Fixed</option><option value="percentage">Percentage</option><option value="formula">Formula</option></select></label></div>
        {form.computationType === "fixed" && <label>Fixed Amount<input type="number" step="0.01" value={form.fixedAmount} onChange={(event) => setForm({ ...form, fixedAmount: event.target.value })} required /></label>}
        {form.computationType === "percentage" && <div className="detail-grid payroll-rule-grid"><label>Percentage Base<select value={form.percentageBase} onChange={(event) => setForm({ ...form, percentageBase: event.target.value })}><option value="contract_wage">Contract wage</option><option value="basic_salary">Basic salary</option><option value="gross_salary">Gross salary</option></select></label><label>Percentage Value<input type="number" step="0.01" value={form.percentageValue} onChange={(event) => setForm({ ...form, percentageValue: event.target.value })} required /></label></div>}
        {form.computationType === "formula" && <label>Formula Expression<textarea rows="3" value={form.formulaExpression} placeholder="contractWage / 30 * (30 - workedDays)" onChange={(event) => setForm({ ...form, formulaExpression: event.target.value })} required /></label>}
        <p className="muted payroll-formula-note">Formula rules use safe math expressions with prior rule codes, <code>contractWage</code>, and <code>workedDays</code>; they never execute JavaScript or Python.</p>
        <label><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Active</label><div className="form-actions"><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>{selected && <button className="secondary" type="button" onClick={remove}>Delete</button>}</div>
      </form></div>
  </main>;
}
