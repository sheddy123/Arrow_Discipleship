import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(form)
      setAuth(
        { userId: data.userId, email: data.email, firstName: data.firstName, lastName: data.lastName, role: data.role, status: data.status },
        data.accessToken,
        data.refreshToken,
      )
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-transparent px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeSwitcher />
      </div>
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-6 text-center">
          <span className="font-[Sora,sans-serif] text-2xl font-extrabold tracking-tight text-[var(--du-primary)]">
            Disciple<span className="text-[var(--gold)]">Up</span>
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-7 shadow-[0_10px_40px_-12px_rgba(12,36,48,.18)]">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your DiscipleUp account</p>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" required autoFocus
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password"
                  className="text-xs font-medium text-[var(--du-primary)] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password" type="password" required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full bg-[var(--du-primary)] text-white hover:bg-[var(--du-primary)] hover:brightness-110"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-[var(--du-primary)] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
