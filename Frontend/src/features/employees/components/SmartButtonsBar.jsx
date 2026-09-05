import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../../common/utils/api";
import { getAttendance } from "../../attendance/attendanceApi";

export default function SmartButtonsBar({ employeeId }) {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    let isCurrent = true;
    const loadCount = async (key, request) => {
      try {
        const records = await request();
        if (isCurrent) setCounts((current) => ({ ...current, [key]: Array.isArray(records) ? records.length : undefined }));
      } catch {
        // Contract and time-off APIs are placeholders until those features are built.
      }
    };

    loadCount("contracts", () => apiRequest(`/contracts?employee=${employeeId}`));
    loadCount("attendance", () => getAttendance({ employee: employeeId }));
    loadCount("timeOff", () => apiRequest(`/timeoff?employee=${employeeId}`));

    return () => { isCurrent = false; };
  }, [employeeId]);

  const buttons = [
    { key: "contracts", label: "Contracts", onClick: () => navigate(`/contracts?employee=${employeeId}`) },
    { key: "attendance", label: "Attendance", onClick: () => navigate(`/attendance?employee=${employeeId}`) },
    { key: "timeOff", label: "Time Off", onClick: () => navigate(`/timeoff?employee=${employeeId}`) },
  ];

  return <div className="smart-buttons-bar">
    {buttons.map((button) => <button key={button.key} type="button" className="smart-button" onClick={button.onClick}>{button.label}{counts[button.key] !== undefined && <span className="smart-button-count">{counts[button.key]}</span>}</button>)}
  </div>;
}
