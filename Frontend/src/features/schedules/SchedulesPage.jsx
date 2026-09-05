import { useState } from 'react'
import SchedulesListPage from './SchedulesListPage'
import SchedulesFormPage from './SchedulesFormPage'

export default function SchedulesPage() {
  const [editingSchedule, setEditingSchedule] = useState(undefined)

  if (editingSchedule !== undefined) {
    return <SchedulesFormPage schedule={editingSchedule} onSaved={() => setEditingSchedule(undefined)} onCancel={() => setEditingSchedule(undefined)} />
  }

  return <SchedulesListPage onAdd={() => setEditingSchedule(null)} onEdit={setEditingSchedule} />
}