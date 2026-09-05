import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getUserDetails } from "./usersApi";

const roleLabel = (role = "") => role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const valueOrDash = (value) => value || "Not provided";

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getUserDetails(userId).then(setDetails).catch((requestError) => setError(requestError.message));
  }, [userId]);

  if (error) return <main className="profile-page"><button className="link-button" type="button" onClick={() => navigate(-1)}>← Back</button><p className="error">{error}</p></main>;
  if (!details) return <main className="profile-page"><p className="muted">Loading profile...</p></main>;

  const { user, employee } = details;
  return <main className="profile-page">
    <button className="link-button profile-back" type="button" onClick={() => navigate(-1)}>← Back</button>
    <header className="profile-header"><div><p className="eyebrow">PeoplePay360 / Profile</p><h1>{employee?.name || user.email}</h1><p className="muted">Complete account and employee information</p></div><span className={`status ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Active" : "Inactive"}</span></header>
    <div className="profile-grid">
      <section className="profile-card"><p className="eyebrow">User account</p><h2>Access details</h2><dl className="profile-details"><div><dt>Role</dt><dd>{roleLabel(user.role)}</dd></div><div><dt>Account status</dt><dd>{user.isActive ? "Active" : "Inactive"}</dd></div><div><dt>Created</dt><dd>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Not provided"}</dd></div></dl></section>
      <section className="profile-card"><p className="eyebrow">Employee record</p><h2>{employee ? "Work information" : "No employee linked"}</h2>{employee ? <dl className="profile-details"><div><dt>Employee ID</dt><dd>{employee._id}</dd></div><div><dt>Work email</dt><dd>{valueOrDash(employee.email)}</dd></div><div><dt>Phone</dt><dd>{valueOrDash(employee.phone)}</dd></div><div><dt>Department</dt><dd>{valueOrDash(employee.department)}</dd></div><div><dt>Job position</dt><dd>{valueOrDash(employee.jobPosition)}</dd></div><div><dt>Employee type</dt><dd>{valueOrDash(employee.employeeType)}</dd></div><div><dt>Work location</dt><dd>{valueOrDash(employee.workLocation)}</dd></div><div><dt>Join date</dt><dd>{employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : "Not provided"}</dd></div><div><dt>Manager</dt><dd>{employee.manager?.name || "None"}</dd></div><div><dt>Working schedule</dt><dd>{employee.workingSchedule?.name || "None"}</dd></div></dl> : <p className="muted">This account is not linked to an employee record.</p>}</section>
    </div>
    <Link className="secondary profile-link" to="/dashboard">Return to dashboard</Link>
  </main>;
}