import { Route, Routes } from 'react-router-dom'
import DashboardPage from '../dashboard/DashboardPage'
import PayrunsListPage from './PayrunsListPage'
import PayrunDetailPage from './PayrunDetailPage'
import PayslipsListPage from './PayslipsListPage'
import PayslipDetailPage from './PayslipDetailPage'
import SalaryStructuresPage from './SalaryStructuresPage'

export default function PayrollPage() {
  return (
    <Routes>
      <Route path="" element={<PayrunsListPage />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="payruns" element={<PayrunsListPage />} />
      <Route path="payruns/:id" element={<PayrunDetailPage />} />
      <Route path="payslips" element={<PayslipsListPage />} />
      <Route path="payslips/:id" element={<PayslipDetailPage />} />
      <Route path="structures" element={<SalaryStructuresPage />} />
    </Routes>
  )
}
