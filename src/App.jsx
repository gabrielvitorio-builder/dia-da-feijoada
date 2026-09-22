import { Routes, Route, Navigate } from 'react-router-dom'
import OrderFlow from './pages/OrderFlow.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import Producao from './pages/Producao.jsx'
import { useAdminAuth } from './context/AdminAuthContext.jsx'

function RequireAdmin({ children }) {
  const { isAuthed } = useAdminAuth()
  if (!isAuthed) return <Navigate to="/admin" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OrderFlow />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route
        path="/admin/painel"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />
      <Route
        path="/producao"
        element={
          <RequireAdmin>
            <Producao />
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
