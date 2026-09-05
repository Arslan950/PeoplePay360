import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getAttendance } from "./attendanceApi";

const formatDateValue = (value) => value ? new Date(value).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-";
const formatMinutes = (minutes) => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "-";
  const totalMinutes = Math.max(0, Number(minutes));
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
};

export default function AttendancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scopedEmployeeId = searchParams.get("employee");
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ employee: "", from: "", to: "" });
  const [error, setError] = useState("");
  const isEmployee = user?.role === "employee";
  const isScoped = Boolean(scopedEmployeeId);

  const load = async () => {
    try {
      const params = { ...filters, employee: scopedEmployeeId || filters.employee };
      if (isEmployee) delete params.employee;
      setRecords(await getAttendance(params));
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => { load(); }, [user?.role, scopedEmployeeId, filters.employee, filters.from, filters.to]);

  const employeeName = records[0]?.employee?.name;
  const showEmployeeColumn = !isEmployee && !isScoped;
  return <main className="app-shell">
    {isScoped && <button type="button" className="link-button back-link" onClick={() => navigate(-1)}>← Back to employee{employeeName ? `: ${employeeName}` : ""}</button>}
    <header className="page-header"><div><p className="eyebrow">PeoplePay360 / Attendance</p><h1>Attendance</h1></div></header>
    <section className="toolbar">
      {!isEmployee && !isScoped && <input placeholder="Employee ID" value={filters.employee} onChange={(event) => setFilters({ ...filters, employee: event.target.value })} />}
      <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
      <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
    </section>
    {error && <p className="error">{error}</p>}
    <div className="table-wrap"><table><thead><tr>{showEmployeeColumn && <th>Employee</th>}<th>Check-in</th><th>Check-out</th><th>Duration</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr className="attendance-row" key={record._id} onClick={() => navigate(`/attendance/${record._id}`)}>{showEmployeeColumn && <td>{record.employee?.name || record.employee?._id || "-"}</td>}<td>{formatDateValue(record.checkIn)}</td><td>{record.checkOut ? formatDateValue(record.checkOut) : "-"}</td><td>{record.checkOut ? formatMinutes(record.durationMinutes) : "Open"}</td><td><span className={`status ${record.checkOut ? "inactive" : "active"}`}>{record.checkOut ? "closed" : "open"}</span></td></tr>)}</tbody></table></div>
  </main>;
}
