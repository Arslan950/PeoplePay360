import { useState } from 'react'
import EmployeeListPage from './EmployeeListPage'
import EmployeeFormPage from './EmployeeFormPage'

export default function EmployeesPage() {
  const [editingEmployee, setEditingEmployee] = useState(undefined)

  if (editingEmployee !== undefined) {
    return <EmployeeFormPage employee={editingEmployee} onSaved={() => setEditingEmployee(undefined)} onCancel={() => setEditingEmployee(undefined)} />
  }

  return <EmployeeListPage onAdd={() => setEditingEmployee(null)} onEdit={setEditingEmployee} />
}