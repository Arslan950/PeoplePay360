import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) return <main className="loading">Loading...</main>
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
