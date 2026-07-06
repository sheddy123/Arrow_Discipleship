import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type CohortSummary } from '@/api/admin'

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Published: 'bg-blue-50 text-blue-700',
  Active: 'bg-green-50 text-green-700',
  Archived: 'bg-amber-50 text-amber-700',
}

export default function CohortsPage() {
  const qc = useQueryClient()
  const { data: cohorts = [], isLoading } = useQuery({
    queryKey: ['admin', 'cohorts'],
    queryFn: () => adminApi.listCohorts().then((r) => r.data),
  })

  const publish = useMutation({
    mutationFn: (id: number) => adminApi.publishCohort(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cohorts'] }),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Cohorts</h1>
        <Link
          to="/admin/cohorts/new"
          className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
        >
          + New cohort
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : cohorts.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No cohorts yet. Create one to get started.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Start date</th>
                <th className="px-5 py-3">Mentor</th>
                <th className="px-5 py-3">Students</th>
                <th className="px-5 py-3">Weeks</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cohorts.map((c: CohortSummary) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-5 py-3 text-gray-600">{c.startDate}</td>
                  <td className="px-5 py-3 text-gray-600">{c.mentorName}</td>
                  <td className="px-5 py-3 text-gray-600">{c.enrolledStudents}</td>
                  <td className="px-5 py-3 text-gray-600">{c.weekCount} / 4</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Link to={`/admin/cohorts/${c.id}/content`} className="text-purple-600 hover:underline text-xs">
                        Edit content
                      </Link>
                      {c.status === 'Draft' && c.weekCount > 0 && (
                        <button
                          onClick={() => publish.mutate(c.id)}
                          className="text-green-600 hover:underline text-xs"
                        >
                          Publish
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
