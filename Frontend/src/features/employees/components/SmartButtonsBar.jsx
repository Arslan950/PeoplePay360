import { useNavigate } from "react-router-dom";

export default function SmartButtonsBar({ employeeId }) {
  const navigate = useNavigate();
  const buttons = [
    { label: "Attendance", onClick: () => navigate(`/attendance?employee=${employeeId}`) },
  ];

  return <div className="smart-buttons-bar">
    {buttons.map((button) => <button key={button.label} type="button" className="smart-button" onClick={button.onClick}>{button.label}</button>)}
  </div>;
}
