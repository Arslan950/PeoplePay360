import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { correctAttendance, getAttendanceById } from "./attendanceApi";

const toDateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
};
const formatDate = (value) => value ? new Date(value).toLocaleDateString([], { dateStyle: "medium" }) : "-";
const formatDateTime = (value) => value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "-";

export default function AttendanceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState({ checkIn: "", checkOut: "", notes: "" });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canEdit = user?.role === "admin" || user?.role === "hr_manager";

  const load = async () => {
    try {
      setLoading(true);
      const data = await getAttendanceById(id);
      setRecord(data);
      setForm({ checkIn: toDateTimeInput(data.checkIn), checkOut: toDateTimeInput(data.checkOut), notes: data.notes || "" });
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const save = async (event) => {
    event.preventDefault();
    if (!form.checkIn) {
      setError("Check In is required");
      return;
    }
    try {
      await correctAttendance(id, { checkIn: form.checkIn ? new Date(form.checkIn).toISOString() : null, checkOut: form.checkOut ? new Date(form.checkOut).toISOString() : null, notes: form.notes });
      setEditing(false);
      await load();
    } catch (requestError) { setError(requestError.message); }
  };

  if (loading) return <main className="loading">Loading attendance record…</main>;
  if (!record) return <main className="app-shell"><p className="error">{error || "Attendance record not found"}</p></main>;
  const employee = record.employee || {};
  return <main className="app-shell">
    <header className="page-header"><div><p className="eyebrow">Attendance / {employee.name || "Employee"} / {formatDate(record.checkIn)}</p><h1>Attendance</h1></div><div className="page-actions">{canEdit && <button type="button" onClick={() => setEditing((value) => !value)}>{editing ? "Cancel" : "Edit"}</button>}<button type="button" className="secondary" onClick={() => navigate(-1)}>Back</button></div></header>
    {error && <p className="error">{error}</p>}
    <form className="form-card attendance-detail-card" onSubmit={save}>
      <div className="detail-grid">
        <div className="detail-field"><span>Employee</span><strong>{employee.name || "-"}</strong></div><div className="detail-field"><span>Department</span><strong>{employee.department || "-"}</strong></div>
        <div className="detail-field"><span>Check In</span>{editing ? <input type="datetime-local" value={form.checkIn} onChange={(event) => setForm({ ...form, checkIn: event.target.value })} /> : <strong>{formatDateTime(record.checkIn)}</strong>}</div><div className="detail-field"><span>Manager</span><strong>{employee.manager?.name || "-"}</strong></div>
        <div className="detail-field"><span>Check Out</span>{editing ? <input type="datetime-local" value={form.checkOut} onChange={(event) => setForm({ ...form, checkOut: event.target.value })} /> : <strong>{formatDateTime(record.checkOut)}</strong>}</div><div className="detail-field"><span>Status</span><strong>{record.checkOut ? "Present" : "Open"}</strong></div>
        <div className="detail-field"><span>Worked Hours</span><strong>{record.workedHours == null ? "-" : record.workedHours.toFixed(2)}</strong></div><div className="detail-field"><span>Overtime</span><strong>{record.overtime == null ? "-" : `${record.overtime.toFixed(2)} hrs`}</strong></div>
        <label className="detail-field detail-notes"><span>Notes</span>{editing ? <textarea rows="4" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /> : <strong>{record.notes || "-"}</strong>}</label>
      </div>
      {editing && <button type="submit">Save changes</button>}
    </form>
  </main>;
}
