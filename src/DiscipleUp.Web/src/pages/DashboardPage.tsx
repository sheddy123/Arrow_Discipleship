import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  async function handleLogout() {
    const refreshToken = localStorage.getItem('refreshToken') ?? ''
    try { await authApi.logout(refreshToken) } catch { /* ignore */ }
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-purple-700 text-lg">DiscipleUp</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Hi, {user?.firstName}</span>
          <button onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="text-6xl mb-4">🌱</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome, {user?.firstName}!
        </h1>
        <p className="text-gray-500 text-sm">
          Your dashboard is on its way — Sprint 3 builds this out.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-100 text-xs text-purple-700">
          Role: <strong>{user?.role}</strong>
        </div>
      </main>
    </div>
  )
}
