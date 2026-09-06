import { useState } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { LogOut, ChevronDown, ChevronRight } from "lucide-react"
import { HR_ROLES, PAYROLL_ROLES, canAccess } from '../utils/roles'

const navigationItems = [
  { id: 'employees', label: 'Employees', path: '/employees', roles: HR_ROLES },
  { id: 'contracts', label: 'Contracts', path: '/contracts', roles: HR_ROLES },
  { id: 'schedules', label: 'Schedules', path: '/schedules', roles: HR_ROLES },
  { id: 'attendance', label: 'Attendance', path: '/attendance' },
  { id: 'timeoff', label: 'Time off', path: '/timeoff' },
  {
    id: 'payroll',
    label: 'Payroll',
    roles: PAYROLL_ROLES,
    children: [
      { id: 'payroll-dashboard', label: 'Dashboard', path: '/payroll/dashboard' },
      { id: 'payroll-payruns', label: 'Payruns', path: '/payroll/payruns' },
      { id: 'payroll-payslips', label: 'Payslips', path: '/payroll/payslips' },
      { id: 'payroll-structures', label: 'Structures', path: '/payroll/structures' },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [openMenus, setOpenMenus] = useState({})

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  const toggleMenu = (id) => {
    setOpenMenus((current) => ({
      ...current,
      [id]: !current[id],
    }))
  }

  return (
    <aside className="navbar">
      <div className="navbar-brand">
        <span className="brand-mark">PP</span>
        <span>PeoplePay360</span>
      </div>

      <nav aria-label="Main navigation">
        {navigationItems.filter((item) => !item.roles || canAccess(user, item.roles)).map((item) => {
          if (item.children) {
            return (
              <div key={item.id} className="navbar-group">
                <button
                  type="button"
                  className={`navbar-item ${openMenus[item.id] ? 'active' : ''}`}
                  onClick={() => toggleMenu(item.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                >
                  <span>{item.label}</span>
                  {openMenus[item.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {openMenus[item.id] && (
                  <div
                    className="navbar-submenu"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      marginTop: '0.25rem',
                      position: 'absolute',
                      zIndex: 50,
                      left: 0,
                      minWidth: '100%'
                    }}
                  >
                    {item.children.map((child) => (
                      <NavLink
                        key={child.id}
                        to={child.path}
                        className={({ isActive }) => `navbar-item ${isActive ? 'active' : ''}`}
                        onClick={() => setOpenMenus((current) => ({ ...current, [item.id]: false }))}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          // Added the missing return for standard links
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.id === 'dashboard'}
              className={({ isActive }) => `navbar-item ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="navbar-footer">
        <Link className="navbar-user navbar-profile-link" to={`/profile/${user?._id}`}>
          <strong>{user?.employeeName || user?.email}</strong>
          <span>{user?.role?.replaceAll('_', ' ')}</span>
        </Link>
        <button className="navbar-signout flex" onClick={handleSignOut} type="button">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  )
}
