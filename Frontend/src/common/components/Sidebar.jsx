import { NavLink, useNavigate, Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../features/auth/AuthContext'

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { id: 'employees', label: 'Employees', path: '/employees' },
  { id: 'contracts', label: 'Contracts', path: '/contracts' },
  { id: 'schedules', label: 'Schedules', path: '/schedules' },
  { id: 'attendance', label: 'Attendance', path: '/attendance' },
  { id: 'timeoff', label: 'Time off', path: '/timeoff' },
  { id: 'payroll', label: 'Payroll', path: '/payroll' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="navbar">
      <div className="navbar-brand">
        <span className="brand-mark">PP</span>
        <span>PeoplePay360</span>
      </div>
      <nav aria-label="Main navigation">
        {navigationItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.id === 'dashboard'}
            className={({ isActive }) => `navbar-item ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="navbar-footer">
        <Link className="navbar-user navbar-profile-link" to={`/profile/${user?._id}`}>
          <strong>{user?.employeeName || user?.email}</strong>
          <span>{user?.role?.replaceAll('_', ' ')}</span>
        </Link>
        <button className="navbar-signout" onClick={handleSignOut} type="button" aria-label="Sign out" title="Sign out">
          <LogOut size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
