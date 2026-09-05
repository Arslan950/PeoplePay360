import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { checkIn, checkOut, getAttendance } from "./attendanceApi";

const formatDateValue = (value) => value ? new Date(value).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "-";
const formatDateOnly = (value) => value ? new Date(value).toLocaleDateString([], { dateStyle: "medium" }) : "-";
const formatTimeOnly = (value) => value ? new Date(value).toLocaleTimeString([], { timeStyle: "short" }) : "-";
const formatMinutes = (minutes) => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "-";
  const totalMinutes = Math.max(0, Number(minutes));
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
};

const formatLiveDuration = (checkInTime, now) => {
  if (!checkInTime) return "-";
  const totalSeconds = Math.max(0, Math.floor((now - new Date(checkInTime).getTime()) / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

export default function AttendancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scopedEmployeeId = searchParams.get("employee");
  const [records, setRecords] = useState([]);
  const [filters, setFilters] = useState({ employee: "", from: "", to: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState("list");
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

  const openRecord = useMemo(() => isEmployee ? records.find((record) => !record.checkOut) : null, [isEmployee, records]);
  useEffect(() => {
    if (!openRecord) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [openRecord?._id]);

  const handleCheckIn = async () => {
    try {
      setSubmitting(true);
      setError("");
      await checkIn();
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (event, recordId) => {
    event.stopPropagation();
    try {
      setSubmitting(true);
      setError("");
      await checkOut(recordId);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const employeeName = records[0]?.employee?.name;
  const showEmployeeColumn = !isEmployee && !isScoped;
  return <main className="app-shell">
    {isScoped && <button type="button" className="link-button back-link" onClick={() => navigate(-1)}>← Back to employee{employeeName ? `: ${employeeName}` : ""}</button>}
    <header className="page-header"><div><p className="eyebrow">PeoplePay360 / Attendance</p><h1>Attendance</h1></div></header>
    <section className="toolbar">
      {!isEmployee && !isScoped && <input placeholder="Employee ID" value={filters.employee} onChange={(event) => setFilters({ ...filters, employee: event.target.value })} />}
      <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
      <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
      <button className="secondary" type="button" onClick={() => setView(view === "list" ? "kanban" : "list")}>
        {view === "list" ? "Kanban view" : "List view"}
      </button>
    </section>
    {error && <p className="error">{error}</p>}
    {view === "list" ? (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              {showEmployeeColumn && <th>Employee</th>}
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isEmployee && !openRecord && (
              <tr className="attendance-action-row">
                <td>-</td>
                <td>{formatDateOnly(new Date())}</td>
                {showEmployeeColumn && <td>-</td>}
                <td><button type="button" onClick={handleCheckIn} disabled={submitting}>Check In</button></td>
                <td>-</td>
                <td>-</td>
                <td><span className="status inactive">not checked in</span></td>
              </tr>
            )}
            {records.map((record, index) => (
              <tr className="attendance-row" key={record._id} onClick={() => navigate(`/attendance/${record._id}`)}>
                <td>{index + 1}</td>
                <td>{record.date ? new Date(record.date).toLocaleDateString([], { dateStyle: "medium" }) : formatDateOnly(record.checkIn)}</td>
                {showEmployeeColumn && <td>{record.employee?.name || record.employee?._id || "-"}</td>}
                <td>{formatTimeOnly(record.checkIn)}</td>
                <td>{!record.checkOut && isEmployee ? <button type="button" onClick={(event) => handleCheckOut(event, record._id)} disabled={submitting}>Check Out</button> : formatTimeOnly(record.checkOut)}</td>
                <td>{record.checkOut ? formatMinutes(record.durationMinutes) : formatLiveDuration(record.checkIn, now)}</td>
                <td><span className={`status ${record.checkOut ? "inactive" : "active"}`}>{record.checkOut ? "closed" : "open"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="kanban-grid">
        {isEmployee && !openRecord && (
          <article className="attendance-card attendance-card-action">
            <div className="card-top">
              <span className="status inactive">not checked in</span>
              <span className="card-badge">{formatDateOnly(new Date())}</span>
            </div>
            <h2>Today's Attendance</h2>
            <p className="muted">You have not checked in for today yet.</p>
            <div className="card-actions">
              <button type="button" onClick={handleCheckIn} disabled={submitting}>Check In</button>
            </div>
          </article>
        )}
        {records.map((record) => {
          const isOpen = !record.checkOut;
          const dateStr = record.date ? new Date(record.date).toLocaleDateString([], { dateStyle: "medium" }) : formatDateOnly(record.checkIn);
          const empName = record.employee?.name || record.employee?._id || "Employee";
          return (
            <article className="attendance-card" key={record._id} onClick={() => navigate(`/attendance/${record._id}`)}>
              <div className="card-top">
                <span className={`status ${isOpen ? "active" : "inactive"}`}>
                  {isOpen ? "open" : "closed"}
                </span>
                <span className="card-badge">{dateStr}</span>
              </div>
              <h2>
                {showEmployeeColumn ? (
                  <span className="attendance-card-name">{empName}</span>
                ) : (
                  <span className="attendance-card-name">{dateStr}</span>
                )}
              </h2>
              <div className="card-meta">
                <p>
                  <span>Check-in:</span>
                  <strong>{formatTimeOnly(record.checkIn)}</strong>
                </p>
                <p>
                  <span>Check-out:</span>
                  <strong>
                    {isOpen && isEmployee ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={(event) => handleCheckOut(event, record._id)}
                        disabled={submitting}
                      >
                        Check Out
                      </button>
                    ) : (
                      formatTimeOnly(record.checkOut)
                    )}
                  </strong>
                </p>
                <p>
                  <span>Duration:</span>
                  <strong className={isOpen ? "live-duration" : ""}>
                    {record.checkOut ? formatMinutes(record.durationMinutes) : formatLiveDuration(record.checkIn, now)}
                  </strong>
                </p>
              </div>
              <div className="card-actions">
                <button
                  type="button"
                  className="link-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/attendance/${record._id}`);
                  }}
                >
                  View details →
                </button>
              </div>
            </article>
          );
        })}
      </div>
    )}
  </main>;
}
