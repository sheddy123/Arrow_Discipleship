import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import ConsentCompletePage from './pages/auth/ConsentCompletePage'
import StudentLayout from './pages/student/StudentLayout'
import DashboardPage from './pages/DashboardPage'
import JourneyPage from './pages/JourneyPage'
import WeekPage from './pages/WeekPage'
import MentorLayout from './pages/mentor/MentorLayout'
import MentorDashboardPage from './pages/mentor/MentorDashboardPage'
import MentorReviewPage from './pages/mentor/MentorReviewPage'
import MentorStudentPage from './pages/mentor/MentorStudentPage'
import MentorPrayerPage from './pages/mentor/MentorPrayerPage'
import MentorAnnouncePage from './pages/mentor/MentorAnnouncePage'
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
      {/* Auth (no layout) */}
      <Route path="/login"          element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register"       element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
      <Route path="/consent/complete" element={<ConsentCompletePage />} />

      {/* Student routes — all share the sidebar layout */}
      <Route element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
        <Route path="/dashboard"         element={<DashboardPage />} />
        <Route path="/journey"           element={<JourneyPage />} />
        <Route path="/week/:weekNumber"  element={<WeekPage />} />
      </Route>

      {/* Mentor — nested under MentorLayout */}
      <Route path="/mentor" element={<ProtectedRoute roles={['Mentor', 'Admin']}><MentorLayout /></ProtectedRoute>}>
        <Route index element={<MentorDashboardPage />} />
        <Route path="review"              element={<MentorReviewPage />} />
        <Route path="students/:studentId" element={<MentorStudentPage />} />
        <Route path="prayer"              element={<MentorPrayerPage />} />
        <Route path="announcements"       element={<MentorAnnouncePage />} />
      </Route>

      {/* Admin — nested under AdminLayout */}
      <Route path="/admin" element={<ProtectedRoute roles={['Admin']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/admin/cohorts" replace />} />
        <Route path="cohorts"          element={<CohortsPage />} />
        <Route path="cohorts/new"      element={<CohortFormPage />} />
        <Route path="cohorts/:id/content" element={<ContentEditorPage />} />
        <Route path="users"            element={<UsersPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
