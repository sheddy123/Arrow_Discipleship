import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/api/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
          <p className="text-sm text-gray-600">
            If an account with that email exists, we've sent a password reset link. It expires in 2 hours.
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm text-purple-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Reset password</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send a reset link.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="you@example.com" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 transition-colors">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          <Link to="/login" className="text-purple-600 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
