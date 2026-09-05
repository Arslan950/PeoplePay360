import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { checkIn, checkOut, getAttendance } from "./attendanceApi";

const formatDuration = (dateValue, now = Date.now()) => {
  if (!dateValue) return "00:00:00";
  const diffMs = now - new Date(dateValue).getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

export default function AttendanceStatusWidget() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(Date.now());

  const isEmployee = user?.role === "employee";
  const canShowWidget = user && (isEmployee || user.employee);

  const openRecord = useMemo(() => records.find((record) => !record.checkOut), [records]);

  const load = async () => {
    if (!canShowWidget) {
      setRecords([]);
      return;
    }

    try {
      const params = isEmployee ? {} : { employee: user.employee };
      const data = await getAttendance(params);
      setRecords(data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  useEffect(() => {
    load();
  }, [user?.role, user?.employee]);

  useEffect(() => {
    if (!openRecord) return undefined;
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [openRecord?._id]);

  const handleAction = async () => {
    try {
      if (openRecord) {
        await checkOut(openRecord._id);
      } else {
        await checkIn(isEmployee ? {} : { employee: user.employee });
      }
      setShowPopup(false);
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  if (!canShowWidget) return null;

  const currentStatusText = openRecord ? formatDuration(openRecord.checkIn, tick) : "Not checked in";

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button
        type="button"
        onClick={() => setShowPopup((value) => !value)}
        style={{
          background: "transparent",
          color: "#eaf5f1",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "8px 10px",
          borderRadius: "8px",
          textAlign: "left",
        }}
      >
        <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "999px", background: openRecord ? "#22c55e" : "#ef4444" }} />
        <span>
          {openRecord ? `${currentStatusText} active` : "Check in"}
        </span>
      </button>
      {error && <p className="error" style={{ margin: "8px 0 0" }}>{error}</p>}
      {showPopup && (
        <div className="modal">
          <div className="modal-card">
            <p className="eyebrow">Attendance</p>
            <h2>{openRecord ? "Currently checked in" : "Ready to check in"}</h2>
            <p style={{ margin: "12px 0" }}>{openRecord ? `In session: ${formatDuration(openRecord.checkIn, tick)}` : "No active check-in found"}</p>
            <button type="button" onClick={handleAction}>{openRecord ? "Check Out" : "Check In"}</button>
            <button type="button" className="secondary" style={{ marginTop: "12px", width: "100%" }} onClick={() => setShowPopup(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
