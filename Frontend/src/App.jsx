import './App.css'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import LoginPage from './features/auth/LoginPage'
import Sidebar from './common/components/Sidebar'
import ProtectedRoute from './common/components/ProtectedRoute'
import EmployeesPage from './features/employees/EmployeesPage'
import ContractsPage from './features/contracts/ContractsPage'
import SchedulesPage from './features/schedules/SchedulesPage'
import AttendancePage from './features/attendance/AttendancePage'
import AttendanceDetailPage from './features/attendance/AttendanceDetailPage'
import TimeoffPage from './features/timeoff/TimeoffPage'
import PayrollPage from './features/payroll/PayrollPage'
import UserProfilePage from './features/users/UserProfilePage'

function LoginRoute() {
  const { user } = useAuth()

  if (user) return <Navigate to="/employees" replace />
  return <LoginPage />
}

function AppLayout() {
  return <div className="app-layout">
    <Sidebar />
    <section className="app-content">
      <Outlet />
    </section>
  </div>
}

function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<LoginRoute />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/payroll/dashboard" replace />} />
        <Route path="/employees/*" element={<EmployeesPage />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route path="/schedules/*" element={<SchedulesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/attendance/:id" element={<AttendanceDetailPage />} />
        <Route path="/timeoff" element={<TimeoffPage />} />
        <Route path="/payroll/*" element={<PayrollPage />} />
        <Route path="/profile/:userId" element={<UserProfilePage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}

export default App
