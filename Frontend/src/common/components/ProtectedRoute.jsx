import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'

export default function ProtectedRoute({ roles }) {
	const { user, loading } = useAuth()

  if (loading) return <main className="loading">Loading...</main>
	if (!user) return <Navigate to="/login" replace />
	if (roles && !roles.includes(user.role)) return <Navigate to="/attendance" replace />

	return <Outlet />
}
