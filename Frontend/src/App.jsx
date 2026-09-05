import './App.css'
import { useState } from 'react'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import EmployeeListPage from './features/employees/EmployeeListPage'
import EmployeeFormPage from './features/employees/EmployeeFormPage'
import SchedulesListPage from './features/schedules/SchedulesListPage'
import SchedulesFormPage from './features/schedules/SchedulesFormPage'
import Navigation from './common/components/Navigation'
import PagePlaceholder from './common/components/PagePlaceholder'

const pageTitles = {
  dashboard: 'Dashboard',
  contracts: 'Contracts',
  attendance: 'Attendance',
  timeoff: 'Time off',
  payroll: 'Payroll',
}

function AppContent() {
  const { user, loading, logout } = useAuth()
  const [editingEmployee, setEditingEmployee] = useState(undefined)
  const [editingSchedule, setEditingSchedule] = useState(undefined)
  const [activePage, setActivePage] = useState('dashboard')
  if (loading) return <main className="loading">Loading...</main>
  if (!user) return <LoginPage />

  const content = editingEmployee !== undefined
    ? <EmployeeFormPage employee={editingEmployee} onSaved={() => setEditingEmployee(undefined)} onCancel={() => setEditingEmployee(undefined)} />
    : editingSchedule !== undefined
      ? <SchedulesFormPage schedule={editingSchedule} onSaved={() => setEditingSchedule(undefined)} onCancel={() => setEditingSchedule(undefined)} />
      : activePage === 'employees'
        ? <EmployeeListPage onAdd={() => setEditingEmployee(null)} onEdit={setEditingEmployee} />
        : activePage === 'schedules'
          ? <SchedulesListPage onAdd={() => setEditingSchedule(null)} onEdit={setEditingSchedule} />
          : <PagePlaceholder title={pageTitles[activePage]} />

  return <div className="app-layout">
    <Navigation activePage={editingEmployee !== undefined ? 'employees' : editingSchedule !== undefined ? 'schedules' : activePage} onNavigate={(page) => { setEditingEmployee(undefined); setEditingSchedule(undefined); setActivePage(page) }} user={user} onLogout={logout} />
    <section className="app-content">{content}</section>
  </div>
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}

export default App
