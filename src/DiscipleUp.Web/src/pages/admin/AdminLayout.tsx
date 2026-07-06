import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'

const navItems = [
  { to: '/admin/cohorts', label: 'Cohorts' },
  { to: '/admin/users', label: 'Users' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  async function handleLogout() {
    const refreshToken = localStorage.getItem('refreshToken') ?? ''
    try { await authApi.logout(refreshToken) } catch { /* ignore */ }
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="font-bold text-purple-700">DiscipleUp</span>
          <span className="ml-2 text-xs text-gray-400 font-medium uppercase tracking-wide">Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-50 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">{user?.firstName}</p>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
