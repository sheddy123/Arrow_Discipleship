import { create } from 'zustand'

interface AuthUser {
  userId: string
  email: string
  firstName: string
  role: string
  status: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
}

function loadUser(): AuthUser | null {
  const token = localStorage.getItem('accessToken')
  const stored = localStorage.getItem('authUser')
  if (!token || !stored) return null
  try { return JSON.parse(stored) } catch { return null }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  isAuthenticated: !!localStorage.getItem('accessToken'),

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('authUser', JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('authUser')
    set({ user: null, isAuthenticated: false })
  },
}))
