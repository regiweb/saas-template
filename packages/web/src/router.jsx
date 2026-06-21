import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth.jsx'
import { AuthPage } from './components/ui/AuthLayout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Welcome from './pages/Welcome.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import UsersList from './pages/admin/UsersList.jsx'
import UserDetail from './pages/admin/UserDetail.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  return loading ? (
    <AuthPage>
      <div className="spin-page" />
    </AuthPage>
  ) : user ? (
    children
  ) : (
    <Navigate to="/login" replace />
  )
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  return loading ? (
    <AuthPage>
      <div className="spin-page" />
    </AuthPage>
  ) : !user ? (
    <Navigate to="/login" replace />
  ) : user.role !== 'admin' ? (
    <Navigate to="/welcome" replace />
  ) : (
    children
  )
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/welcome"
          element={
            <ProtectedRoute>
              <Welcome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={<AdminRoute><AdminDashboard /></AdminRoute>}
        />
        <Route
          path="/admin/users"
          element={<AdminRoute><UsersList /></AdminRoute>}
        />
        <Route
          path="/admin/users/:id"
          element={<AdminRoute><UserDetail /></AdminRoute>}
        />
        <Route
          path="/admin/settings"
          element={<AdminRoute><AdminSettings /></AdminRoute>}
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
