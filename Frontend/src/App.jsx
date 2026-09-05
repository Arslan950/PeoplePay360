import './App.css'
import { useState } from 'react'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import EmployeeListPage from './features/employees/EmployeeListPage'
import EmployeeFormPage from './features/employees/EmployeeFormPage'
import Navigation from './common/components/Navigation'
import PagePlaceholder from './common/components/PagePlaceholder'

const pageTitles = {
  dashboard: 'Dashboard',
  contracts: 'Contracts',
  schedules: 'Schedules',
  attendance: 'Attendance',
  timeoff: 'Time off',
  payroll: 'Payroll',
}

function AppContent() {
  const { user, loading, logout } = useAuth()
  const [editingEmployee, setEditingEmployee] = useState(undefined)
  const [activePage, setActivePage] = useState('dashboard')
  if (loading) return <main className="loading">Loading...</main>
  if (!user) return <LoginPage />

  const content = editingEmployee !== undefined
    ? <EmployeeFormPage employee={editingEmployee} onSaved={() => setEditingEmployee(undefined)} onCancel={() => setEditingEmployee(undefined)} />
    : activePage === 'employees'
      ? <EmployeeListPage onAdd={() => setEditingEmployee(null)} onEdit={setEditingEmployee} />
      : <PagePlaceholder title={pageTitles[activePage]} />

  return <div className="app-layout">
    <Navigation activePage={editingEmployee !== undefined ? 'employees' : activePage} onNavigate={(page) => { setEditingEmployee(undefined); setActivePage(page) }} user={user} onLogout={logout} />
    <section className="app-content">{content}</section>
  </div>
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}

export default App
