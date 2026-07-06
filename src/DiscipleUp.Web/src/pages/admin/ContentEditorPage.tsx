import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type CohortDetail, type WeekItem, type DayItem } from '@/api/admin'

export default function ContentEditorPage() {
  const { id } = useParams<{ id: string }>()
  const cohortId = Number(id)
  const qc = useQueryClient()

  const { data: cohort, isLoading } = useQuery({
    queryKey: ['admin', 'cohort', cohortId],
    queryFn: () => adminApi.getCohort(cohortId).then((r) => r.data),
  })

  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null)
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null)

  const selectedWeek = cohort?.weeks.find((w) => w.id === selectedWeekId) ?? null
  const selectedDay = selectedWeek?.days.find((d) => d.id === selectedDayId) ?? null

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'cohort', cohortId] })

  const addWeek = useMutation({
    mutationFn: () => adminApi.addWeek(cohortId, { title: `Week ${(cohort?.weeks.length ?? 0) + 1}` }),
    onSuccess: invalidate,
  })

  const addDay = useMutation({
    mutationFn: (weekId: number) => adminApi.addDay(cohortId, weekId, {
      title: `Day ${(selectedWeek?.days.length ?? 0) + 1}`,
      devotionText: '',
    }),
    onSuccess: invalidate,
  })

  const addTask = useMutation({
    mutationFn: ({ dayId, title }: { dayId: number; title: string }) =>
      adminApi.addTask(dayId, { title, orderIndex: selectedDay?.tasks.length ?? 0 }),
    onSuccess: invalidate,
  })

  const deleteTask = useMutation({
    mutationFn: (taskId: number) => adminApi.deleteTask(taskId),
    onSuccess: invalidate,
  })

  const addAssignment = useMutation({
    mutationFn: (weekId: number) => adminApi.addAssignment(cohortId, weekId, {
      title: 'Weekly Assignment',
      description: 'Complete the assignment below.',
    }),
    onSuccess: invalidate,
  })

  if (isLoading) return <div className="p-8 text-sm text-gray-500">Loading…</div>
  if (!cohort) return <div className="p-8 text-sm text-red-500">Cohort not found.</div>

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4">
        <Link to="/admin/cohorts" className="text-sm text-gray-500 hover:text-gray-700">← Cohorts</Link>
        <span className="text-gray-300">|</span>
        <h1 className="text-sm font-semibold text-gray-900">{cohort.name}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          cohort.status === 'Draft' ? 'bg-gray-100 text-gray-600' : 'bg-green-50 text-green-700'
        }`}>{cohort.status}</span>
        {cohort.status === 'Draft' && cohort.weeks.length > 0 && (
          <button
            onClick={() => adminApi.publishCohort(cohortId).then(invalidate)}
            className="ml-auto px-4 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
          >
            Publish cohort
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Week list */}
        <div className="w-48 bg-white border-r border-gray-100 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weeks</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {cohort.weeks.map((w) => (
              <button
                key={w.id}
                onClick={() => { setSelectedWeekId(w.id); setSelectedDayId(null) }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  selectedWeekId === w.id ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Week {w.weekNumber}
              </button>
            ))}
          </div>
          {cohort.weeks.length < 4 && cohort.status === 'Draft' && (
            <button
              onClick={() => addWeek.mutate()}
              className="m-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
            >
              + Add week
            </button>
          )}
        </div>

        {/* Day list */}
        {selectedWeek && (
          <div className="w-48 bg-gray-50 border-r border-gray-100 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 bg-white">
              <p className="text-xs font-semibold text-gray-700">{selectedWeek.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {selectedWeek.days.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDayId(d.id)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    selectedDayId === d.id ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  Day {d.dayNumber}
                </button>
              ))}
              {/* Assignment row */}
              {selectedWeek.assignments.length === 0 ? (
                <button
                  onClick={() => addAssignment.mutate(selectedWeek.id)}
                  className="w-full text-left px-4 py-2 text-xs text-gray-400 hover:text-purple-600 transition-colors"
                >
                  + Add assignment
                </button>
              ) : (
                <div className="px-4 py-2 text-xs text-green-600 font-medium">✓ Assignment set</div>
              )}
            </div>
            {selectedWeek.days.length < 7 && cohort.status === 'Draft' && (
              <button
                onClick={() => addDay.mutate(selectedWeek.id)}
                className="m-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
              >
                + Add day
              </button>
            )}
          </div>
        )}

        {/* Day editor */}
        <div className="flex-1 overflow-y-auto">
          {selectedDay ? (
            <DayEditor
              day={selectedDay}
              cohortId={cohortId}
              weekId={selectedWeekId!}
              onSave={invalidate}
              onAddTask={(title) => addTask.mutate({ dayId: selectedDay.id, title })}
              onDeleteTask={(taskId) => deleteTask.mutate(taskId)}
            />
          ) : selectedWeek ? (
            <WeekEditor week={selectedWeek} cohortId={cohortId} onSave={invalidate} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-400">
              Select a week to start editing
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Week editor ───────────────────────────────────────────────────────────────

function WeekEditor({ week, cohortId, onSave }: { week: WeekItem; cohortId: number; onSave: () => void }) {
  const [title, setTitle] = useState(week.title)
  const [description, setDescription] = useState(week.description ?? '')

  const save = useMutation({
    mutationFn: () => adminApi.updateWeek(cohortId, week.id, { title, description }),
    onSuccess: onSave,
  })

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Week {week.weekNumber}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Week title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="px-5 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 transition-colors">
          {save.isPending ? 'Saving…' : 'Save week'}
        </button>
      </div>
    </div>
  )
}

// ── Day editor ────────────────────────────────────────────────────────────────

function DayEditor({ day, cohortId, weekId, onSave, onAddTask, onDeleteTask }: {
  day: DayItem; cohortId: number; weekId: number
  onSave: () => void
  onAddTask: (title: string) => void
  onDeleteTask: (id: number) => void
}) {
  const [fields, setFields] = useState({
    title: day.title,
    devotionText: day.devotionText,
    scriptureReference: day.scriptureReference ?? '',
    scriptureText: day.scriptureText ?? '',
  })
  const [newTask, setNewTask] = useState('')

  const save = useMutation({
    mutationFn: () => adminApi.updateDay(day.id, fields),
    onSuccess: onSave,
  })

  function handleAddTask() {
    if (!newTask.trim()) return
    onAddTask(newTask.trim())
    setNewTask('')
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Day {day.dayNumber}</h2>

      {/* Basic fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Day title</label>
          <input type="text" value={fields.title}
            onChange={(e) => setFields({ ...fields, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Devotion text</label>
          <textarea rows={8} value={fields.devotionText}
            onChange={(e) => setFields({ ...fields, devotionText: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scripture reference</label>
            <input type="text" value={fields.scriptureReference}
              onChange={(e) => setFields({ ...fields, scriptureReference: e.target.value })}
              placeholder="e.g. John 3:16"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scripture text</label>
            <input type="text" value={fields.scriptureText}
              onChange={(e) => setFields({ ...fields, scriptureText: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="px-5 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60 transition-colors">
          {save.isPending ? 'Saving…' : 'Save day'}
        </button>
      </div>

      {/* Tasks */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Tasks</h3>
        <div className="space-y-2 mb-3">
          {day.tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100">
              <span className="text-sm text-gray-800">{t.title}</span>
              <button onClick={() => onDeleteTask(t.id)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors ml-3">
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add a task…"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button onClick={handleAddTask}
            className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
