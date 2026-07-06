import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import ConsentCompletePage from './pages/auth/ConsentCompletePage'
import DashboardPage from './pages/DashboardPage'
import AdminLayout from './pages/admin/AdminLayout'
import CohortsPage from './pages/admin/CohortsPage'
import CohortFormPage from './pages/admin/CohortFormPage'
import ContentEditorPage from './pages/admin/ContentEditorPage'
import UsersPage from './pages/admin/UsersPage'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
      <Route path="/consent/complete" element={<ConsentCompletePage />} />

      {/* Student dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

      {/* Admin — nested under AdminLayout */}
      <Route path="/admin" element={<ProtectedRoute roles={['Admin']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/admin/cohorts" replace />} />
        <Route path="cohorts" element={<CohortsPage />} />
        <Route path="cohorts/new" element={<CohortFormPage />} />
        <Route path="cohorts/:id/content" element={<ContentEditorPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
