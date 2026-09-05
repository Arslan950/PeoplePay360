const navigationItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "employees", label: "Employees" },
  { id: "contracts", label: "Contracts" },
  { id: "schedules", label: "Schedules" },
  { id: "attendance", label: "Attendance" },
  { id: "timeoff", label: "Time off" },
  { id: "payroll", label: "Payroll" },
];

export default function Navigation({ activePage, onNavigate, user, onLogout }) {
  return (
    <aside className="navigation">
      <div className="navigation-brand">
        <span className="brand-mark">PP</span>
        <span>PeoplePay360</span>
      </div>
      <nav aria-label="Main navigation">
        {navigationItems.map((item) => (
          <button
            className={`navigation-item ${activePage === item.id ? "active" : ""}`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="navigation-footer">
        <div className="navigation-user">
          <strong>{user?.email}</strong>
          <span>{user?.role?.replaceAll("_", " ")}</span>
        </div>
        <button className="navigation-signout" onClick={onLogout} type="button">Sign out</button>
      </div>
    </aside>
  );
}
