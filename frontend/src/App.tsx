import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import PerformanceListPage from './pages/PerformanceListPage'
import PerformanceDetailPage from './pages/PerformanceDetailPage'
import PerformanceFormPage from './pages/PerformanceFormPage'
import ApprovalPage from './pages/ApprovalPage'
import AnalyticsPage from './pages/AnalyticsPage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/performance" element={<PerformanceListPage />} />
          <Route path="/performance/new" element={<PerformanceFormPage />} />
          <Route path="/performance/:id" element={<PerformanceDetailPage />} />
          <Route path="/performance/:id/edit" element={<PerformanceFormPage />} />
          <Route path="/approval" element={<ApprovalPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
