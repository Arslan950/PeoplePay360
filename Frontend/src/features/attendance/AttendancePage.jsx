import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { correctAttendance, getAttendance } from "./attendanceApi";

const formatDateValue = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
};

const formatMinutes = (minutes) => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "-";
  const totalMinutes = Math.max(0, Number(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hours}h ${mins}m`;
};

const datetimeLocalValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ employee: "", from: "", to: "" });
  const [error, setError] = useState("");
  const [correctingRecord, setCorrectingRecord] = useState(null);
  const [form, setForm] = useState({ checkIn: "", checkOut: "", notes: "" });
  const isEmployee = user?.role === "employee";
  const canManageAttendance = user?.role === "admin" || user?.role === "hr_manager";

  const load = async () => {
    try {
      const params = { ...filters };
      if (isEmployee) {
        delete params.employee;
      }
      const data = await getAttendance(params);
      setRecords(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    load();
  }, [user?.role, filters.employee, filters.from, filters.to]);

  const openCorrection = (record) => {
    setCorrectingRecord(record);
    setForm({
      checkIn: datetimeLocalValue(record.checkIn),
      checkOut: datetimeLocalValue(record.checkOut),
      notes: record.notes || "",
    });
  };

  const saveCorrection = async (event) => {
    event.preventDefault();
    try {
      const payload = {};
      if (form.checkIn) payload.checkIn = new Date(form.checkIn).toISOString();
      if (form.checkOut) payload.checkOut = new Date(form.checkOut).toISOString();
      if (Object.prototype.hasOwnProperty.call(form, "notes")) payload.notes = form.notes;
      await correctAttendance(correctingRecord._id, payload);
      setCorrectingRecord(null);
      setForm({ checkIn: "", checkOut: "", notes: "" });
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <main className="app-shell">
    <header className="page-header"><div><p className="eyebrow">PeoplePay360 / Attendance</p><h1>Attendance</h1></div></header>
    <section className="toolbar">
      {!isEmployee && <input placeholder="Employee ID" value={filters.employee} onChange={(event) => setFilters({ ...filters, employee: event.target.value })} />}
      <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
      <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
    </section>
    {error && <p className="error">{error}</p>}
    <div className="table-wrap"><table><thead><tr>{!isEmployee && <th>Employee</th>}<th>Check-in</th><th>Check-out</th><th>Duration</th><th>Status</th>{canManageAttendance && <th>Correct</th>}</tr></thead><tbody>{records.map((record) => <tr key={record._id}>{!isEmployee && <td>{record.employee?.name || record.employee?._id || "-"}</td>}<td>{formatDateValue(record.checkIn)}</td><td>{record.checkOut ? formatDateValue(record.checkOut) : "-"}</td><td>{record.checkOut ? formatMinutes(record.durationMinutes) : "Open"}</td><td><span className={`status ${record.checkOut ? "inactive" : "active"}`}>{record.checkOut ? "closed" : "open"}</span></td>{canManageAttendance && <td><button className="link-button" onClick={() => openCorrection(record)}>Correct</button></td>}</tr>)}</tbody></table></div>
    {correctingRecord && <div className="modal"><div className="modal-card"><p className="eyebrow">Correct attendance</p><h2>Update record</h2><form onSubmit={saveCorrection}><label>Check-in<input type="datetime-local" value={form.checkIn} onChange={(event) => setForm({ ...form, checkIn: event.target.value })} /></label><label>Check-out<input type="datetime-local" value={form.checkOut} onChange={(event) => setForm({ ...form, checkOut: event.target.value })} /></label><label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows="3" /></label><button type="submit">Save correction</button><button type="button" className="secondary" onClick={() => setCorrectingRecord(null)} style={{ marginTop: "12px", width: "100%" }}>Cancel</button></form></div></div>}
  </main>;
}