import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type UserSummary } from '@/api/admin'

const ROLES = ['Student', 'Mentor', 'Parent', 'Admin']
const TIMEZONES = Intl.supportedValuesOf('timeZone')

export default function UsersPage() {
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [resetTarget, setResetTarget] = useState<UserSummary | null>(null)
  const [inviteForm, setInviteForm] = useState({
    firstName: '', lastName: '', email: '', role: 'Student',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const [newPassword, setNewPassword] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
  })

  const invite = useMutation({
    mutationFn: () => adminApi.inviteUser(inviteForm),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setFeedback(`User invited. Temporary password: ${res.data.devTempPassword}`)
      setShowInvite(false)
      setInviteForm({ firstName: '', lastName: '', email: '', role: 'Student', timezone: inviteForm.timezone })
    },
    onError: (err: any) => setError(err.response?.data?.error ?? 'Invite failed.'),
  })

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.changeRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const resetPassword = useMutation({
    mutationFn: () => adminApi.adminResetPassword(resetTarget!.id, newPassword),
    onSuccess: () => {
      setFeedback(`Password reset for ${resetTarget!.email}.`)
      setResetTarget(null)
      setNewPassword('')
    },
    onError: (err: any) => setError(err.response?.data?.error ?? 'Reset failed.'),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
        >
          + Invite user
        </button>
      </div>

      {feedback && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex justify-between">
          {feedback}
          <button onClick={() => setFeedback('')} className="text-green-500 hover:text-green-700">✕</button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(users as UserSummary[]).map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.firstName} {u.lastName}</td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    >
                      {ROLES.map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>{u.status}</span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setResetTarget(u)}
                      className="text-xs text-gray-500 hover:text-purple-600 transition-colors"
                    >
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <Modal title="Invite user" onClose={() => setShowInvite(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input type="text" required value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input type="text" required value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select value={inviteForm.timezone}
                onChange={(e) => setInviteForm({ ...inviteForm, timezone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => invite.mutate()} disabled={invite.isPending}
                className="px-5 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 transition-colors">
                {invite.isPending ? 'Inviting…' : 'Send invite'}
              </button>
              <button onClick={() => setShowInvite(false)}
                className="px-5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset password modal */}
      {resetTarget && (
        <Modal title={`Reset password — ${resetTarget.email}`} onClose={() => setResetTarget(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input type="password" minLength={8} value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Min. 8 characters" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => resetPassword.mutate()} disabled={resetPassword.isPending || newPassword.length < 8}
                className="px-5 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 transition-colors">
                {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
              </button>
              <button onClick={() => setResetTarget(null)}
                className="px-5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
