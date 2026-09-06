import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { HR_ROLES, canAccess } from "../../common/utils/roles";
import { archiveSchedule, getSchedules, reactivateSchedule } from "./scheduleApi";

export default function SchedulesListPage({ onAdd, onEdit }) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState("list");
  const canManageSchedules = canAccess(user, HR_ROLES);

  const load = () => {
    getSchedules({ status })
      .then(setSchedules)
      .catch((requestError) => setError(requestError.message));
  };

  useEffect(() => {
    load();
  }, [status]);

  const changeStatus = async (schedule) => {
    try {
      await (schedule.status === "active" ? archiveSchedule(schedule._id) : reactivateSchedule(schedule._id));
      load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return <main className="app-shell">
    <header className="page-header">
      <div>
        <p className="eyebrow">PeoplePay360 / Scheduling</p>
        <h1>Working Schedules</h1>
      </div>
      <div className="page-actions">
        {canManageSchedules && <button onClick={onAdd}>Add schedule</button>}
      </div>
    </header>
    <section className="toolbar">
      <select value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
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
              <th>Name</th>
              <th>Calendar type</th>
              <th>Days / week</th>
              <th>Hours / week</th>
              <th>Status</th>
              {canManageSchedules && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr className="data-row-hover" key={schedule._id}>
                <td>
                  {canManageSchedules ? <button className="link-button" onClick={() => onEdit(schedule)}>{schedule.name}</button> : schedule.name}
                </td>
                <td>{schedule.calendarType || "fixed"}</td>
                <td>{Array.isArray(schedule.weeklyPattern) ? schedule.weeklyPattern.filter((entry) => entry?.isWorkingDay).length : 0}</td>
                <td>{Number(schedule.weeklyHours || 0).toFixed(2)}h</td>
                <td><span className={`status ${schedule.status === "archived" ? "inactive" : schedule.status}`}>{schedule.status}</span></td>
                {canManageSchedules && <td><button className="link-button" onClick={() => changeStatus(schedule)}>{schedule.status === "active" ? "Archive" : "Reactivate"}</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="kanban-grid">
        {schedules.map((schedule) => {
          const workingDays = Array.isArray(schedule.weeklyPattern)
            ? schedule.weeklyPattern.filter((entry) => entry?.isWorkingDay).length
            : 0;
          return (
            <article className="schedule-card" key={schedule._id}>
              <div className="card-top">
                <span className={`status ${schedule.status === "archived" ? "inactive" : schedule.status}`}>
                  {schedule.status}
                </span>
                <span className="card-badge">{schedule.calendarType || "fixed"}</span>
              </div>
              <h2>
                {canManageSchedules ? (
                  <button className="link-button schedule-card-name" onClick={() => onEdit(schedule)}>
                    {schedule.name}
                  </button>
                ) : (
                  schedule.name
                )}
              </h2>
              <div className="card-meta">
                <p>
                  <span>Working days:</span>
                  <strong>{workingDays} days / wk</strong>
                </p>
                <p>
                  <span>Weekly hours:</span>
                  <strong>{Number(schedule.weeklyHours || 0).toFixed(2)}h / wk</strong>
                </p>
              </div>
              {canManageSchedules && (
                <div className="card-actions">
                  <button className="link-button" onClick={() => changeStatus(schedule)}>
                    {schedule.status === "active" ? "Archive" : "Reactivate"}
                  </button>
                  <button className="link-button" onClick={() => onEdit(schedule)}>
                    Edit schedule
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    )}
  </main>;
}
