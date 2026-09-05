import { useMemo, useState } from "react";
import { createSchedule, updateSchedule } from "./scheduleApi";

const defaultPattern = () => [
  { day: "Monday", isWorkingDay: false, startTime: "09:00", endTime: "17:00", breakMinutes: 30 },
  { day: "Tuesday", isWorkingDay: false, startTime: "09:00", endTime: "17:00", breakMinutes: 30 },
  { day: "Wednesday", isWorkingDay: false, startTime: "09:00", endTime: "17:00", breakMinutes: 30 },
  { day: "Thursday", isWorkingDay: false, startTime: "09:00", endTime: "17:00", breakMinutes: 30 },
  { day: "Friday", isWorkingDay: false, startTime: "09:00", endTime: "17:00", breakMinutes: 30 },
  { day: "Saturday", isWorkingDay: false, startTime: "09:00", endTime: "17:00", breakMinutes: 30 },
  { day: "Sunday", isWorkingDay: false, startTime: "09:00", endTime: "17:00", breakMinutes: 30 },
];

const parseTimeToMinutes = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return Number.NaN;
  const match = value.match(/^([0-9]{1,2}):([0-9]{2})$/);
  if (!match) return Number.NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.NaN;
  return (hours * 60) + minutes;
};

const computeWeeklyHours = (weeklyPattern) => {
  if (!Array.isArray(weeklyPattern)) return 0;
  let totalMinutes = 0;
  for (const entry of weeklyPattern) {
    if (!entry || typeof entry !== "object" || entry.isWorkingDay !== true) continue;
    const startMinutes = parseTimeToMinutes(entry.startTime);
    const endMinutes = parseTimeToMinutes(entry.endTime);
    const breakMinutes = Number(entry.breakMinutes);
    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || !Number.isFinite(breakMinutes)) continue;
    const duration = endMinutes - startMinutes - breakMinutes;
    if (duration > 0) totalMinutes += duration;
  }
  return Number((totalMinutes / 60).toFixed(2));
};

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SchedulesFormPage({ schedule, onSaved, onCancel }) {
  const [form, setForm] = useState(schedule || {
    name: "",
    calendarType: "fixed",
    timezone: "",
    weeklyPattern: defaultPattern(),
    status: "active",
  });
  const [error, setError] = useState("");

  const weeklyHours = useMemo(() => computeWeeklyHours(form.weeklyPattern), [form.weeklyPattern]);

  const updatePattern = (index, key, value) => {
    const nextPattern = [...form.weeklyPattern];
    nextPattern[index] = { ...nextPattern[index], [key]: value };
    setForm({ ...form, weeklyPattern: nextPattern });
  };

  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        weeklyPattern: form.weeklyPattern.map((entry, index) => ({ ...entry, day: days[index] })),
      };
      const saved = schedule ? await updateSchedule(schedule._id, payload) : await createSchedule(payload);
      onSaved?.(saved);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <main className="form-shell">
      <button type="button" className="form-close" aria-label="Close form" onClick={onCancel}>x</button>
      <form className="form-card" onSubmit={save}>
        <p className="eyebrow">Working schedule</p>
        <h1>{schedule ? "Edit schedule" : "Add schedule"}</h1>
        <label>
          Name
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <label>
          Calendar type
          <select value={form.calendarType || "fixed"} onChange={(event) => setForm({ ...form, calendarType: event.target.value })}>
            <option value="fixed">Fixed</option>
            <option value="flexible">Flexible</option>
          </select>
        </label>
        <label>
          Timezone
          <input value={form.timezone || ""} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
        </label>

        <div> 
          <p className="eyebrow" style={{ marginTop: "24px" }}>Weekly pattern</p>
          <p className="muted">Weekly hours: {weeklyHours.toFixed(2)}h</p>
        </div>

        {days.map((day, index) => (
          <div key={day} style={{ display: "grid", gridTemplateColumns: "120px 120px 120px 100px", gap: "8px", alignItems: "center", marginTop: "12px" }}>
            <label style={{ margin: 0 }}>
              <span>{day}</span>
              <input
                type="checkbox"
                checked={!!form.weeklyPattern[index]?.isWorkingDay}
                onChange={(event) => updatePattern(index, "isWorkingDay", event.target.checked)}
                style={{ minHeight: "18px" }}
              />
            </label>
            <label style={{ margin: 0 }}>
              <span>Start</span>
              <input type="time" value={form.weeklyPattern[index]?.startTime || "09:00"} onChange={(event) => updatePattern(index, "startTime", event.target.value)} />
            </label>
            <label style={{ margin: 0 }}>
              <span>End</span>
              <input type="time" value={form.weeklyPattern[index]?.endTime || "17:00"} onChange={(event) => updatePattern(index, "endTime", event.target.value)} />
            </label>
            <label style={{ margin: 0 }}>
              <span>Break</span>
              <input type="number" min="0" value={form.weeklyPattern[index]?.breakMinutes || 0} onChange={(event) => updatePattern(index, "breakMinutes", Number(event.target.value) || 0)} />
            </label>
          </div>
        ))}

        {error && <p className="error">{error}</p>}
        <button type="submit">Save schedule</button>
      </form>
    </main>
  );
}
