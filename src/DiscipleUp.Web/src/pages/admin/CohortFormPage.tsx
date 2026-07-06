import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import type { UserSummary } from '@/api/admin'

export default function CohortFormPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    mentorId: '',
    lateEntryWindowDays: 5,
    isPaid: false,
  })
  const [error, setError] = useState('')

  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
  })
  const mentors = (users as UserSummary[]).filter((u) => u.role === 'Mentor' || u.role === 'Admin')

  const create = useMutation({
    mutationFn: () => adminApi.createCohort({ ...form }),
    onSuccess: (res) => navigate(`/admin/cohorts/${res.data.id}/content`),
    onError: (err: any) => setError(err.response?.data?.error ?? 'Failed to create cohort.'),
  })

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-6">
        <Link to="/admin/cohorts" className="text-sm text-gray-500 hover:text-gray-700">← Back to cohorts</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">New cohort</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cohort name</label>
          <input type="text" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. July 2026 Cohort"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
          <input type="date" required value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned mentor</label>
          <select required value={form.mentorId}
            onChange={(e) => setForm({ ...form, mentorId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">Select a mentor…</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.email})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Late entry window (days)
          </label>
          <input type="number" min={0} max={14} value={form.lateEntryWindowDays}
            onChange={(e) => setForm({ ...form, lateEntryWindowDays: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <p className="text-xs text-gray-500 mt-1">Students can self-enrol within this many days of the start date.</p>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="isPaid" checked={form.isPaid}
            onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
          <label htmlFor="isPaid" className="text-sm text-gray-700">
            Paid cohort <span className="text-gray-400">(Stripe integration — Phase 2)</span>
          </label>
        </div>

        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending || !form.name || !form.startDate || !form.mentorId}
            className="px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 transition-colors"
          >
            {create.isPending ? 'Creating…' : 'Create cohort'}
          </button>
          <Link to="/admin/cohorts"
            className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
