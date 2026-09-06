import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { HR_ROLES, canAccess } from "../../common/utils/roles";
import ContractFormPage from "./ContractFormPage";
import { getContracts } from "./contractApi";

export default function ContractsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contracts, setContracts] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [editingContract, setEditingContract] = useState(undefined);
  const [error, setError] = useState("");
  const scopedEmployeeId = searchParams.get("employee");
  const canManageContracts = canAccess(user, HR_ROLES);

  const load = async () => {
    try {
      const filters = scopedEmployeeId ? { employee: scopedEmployeeId } : employeeFilter ? { employee: employeeFilter } : {};
      const data = await getContracts(filters);
      setContracts(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    load();
  }, [scopedEmployeeId, employeeFilter]);

  if (editingContract !== undefined) {
    return <ContractFormPage contract={editingContract} employeeScope={scopedEmployeeId || undefined} onSaved={() => setEditingContract(undefined)} onCancel={() => setEditingContract(undefined)} />;
  }

  return <main className="app-shell">
    <header className="page-header">
      <div>
        <p className="eyebrow">PeoplePay360 / Contracts</p>
        <h1>Contracts</h1>
      </div>
      {canManageContracts && <div className="page-actions"><button onClick={() => setEditingContract(null)}>New contract</button></div>}
    </header>
    <section className="toolbar">
      {!scopedEmployeeId && canManageContracts && <input placeholder="Employee ID" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)} />}
      {scopedEmployeeId && <button className="secondary" type="button" onClick={() => setSearchParams({})}>← Back</button>}
    </section>
    {error && <p className="error">{error}</p>}
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Contract</th>
            {!scopedEmployeeId && <th>Employee</th>}
            <th>Start</th>
            <th>End</th>
            <th>Wage / month</th>
            <th>Status</th>
            {canManageContracts && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr className="data-row-hover" key={contract._id}>
              <td>{canManageContracts ? <button className="link-button" onClick={() => setEditingContract(contract)}>{contract.code || contract.contractNumber || contract._id}</button> : (contract.code || contract.contractNumber || contract._id)}</td>
              {!scopedEmployeeId && <td>{contract.employee?.name || contract.employee?._id || "-"}</td>}
              <td>{contract.startDate ? new Date(contract.startDate).toLocaleDateString() : "-"}</td>
              <td>{contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "Ongoing"}</td>
              <td>{Number(contract.wageMonthly || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td><span className={`status ${contract.status === "running" ? "active" : "inactive"}`}>{contract.status}</span></td>
              {canManageContracts && <td><button className="link-button" onClick={() => setEditingContract(contract)}>Edit</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </main>;
}
