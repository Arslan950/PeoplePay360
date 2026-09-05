import './App.css'
import { useState } from 'react'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import EmployeeListPage from './features/employees/EmployeeListPage'
import EmployeeFormPage from './features/employees/EmployeeFormPage'

function AppContent() {
  const { user, loading } = useAuth()
  const [editingEmployee, setEditingEmployee] = useState(undefined)
  if (loading) return <main className="loading">Loading...</main>
  if (!user) return <LoginPage />
  if (editingEmployee !== undefined) return <EmployeeFormPage employee={editingEmployee} onSaved={() => setEditingEmployee(undefined)} />
  return <EmployeeListPage onAdd={() => setEditingEmployee(null)} onEdit={setEditingEmployee} />
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}

export default App
