export default function EmployeeCard({ employee }) {
  return <article className="employee-card"><h2>{employee.name}</h2><p>{employee.jobPosition}</p></article>;
}
