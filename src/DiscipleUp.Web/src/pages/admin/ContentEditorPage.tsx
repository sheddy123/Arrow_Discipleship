import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Rocket, Trash2, CheckCircle2, ChevronRight, RotateCcw, AlertCircle, X } from 'lucide-react'
import { adminApi, type WeekItem, type DayItem } from '@/api/admin'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'

const tealBtn = 'bg-[var(--du-primary)] text-white hover:bg-[var(--du-primary)] hover:brightness-110'
const greenBtn = 'bg-emerald-600 text-white hover:bg-emerald-600 hover:brightness-110'

const statusBadge: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Published: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Archived: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

export default function ContentEditorPage() {
  const { id } = useParams<{ id: string }>()
  const cohortId = Number(id)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [actionError, setActionError] = useState('')

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
  const deleteWeek = useMutation({
    mutationFn: (weekId: number) => adminApi.deleteWeek(cohortId, weekId),
    onSuccess: () => { setSelectedWeekId(null); setSelectedDayId(null); invalidate() },
    onError: (err: any) => setActionError(err.response?.data?.error ?? 'Could not delete week.'),
  })
  const deleteDay = useMutation({
    mutationFn: (dayId: number) => adminApi.deleteDay(dayId),
    onSuccess: () => { setSelectedDayId(null); invalidate() },
    onError: (err: any) => setActionError(err.response?.data?.error ?? 'Could not delete day.'),
  })
  const addDay = useMutation({
    mutationFn: (weekId: number) => adminApi.addDay(cohortId, weekId, {
      title: `Day ${(selectedWeek?.days.length ?? 0) + 1}`, devotionText: '',
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
  const publish = useMutation({
    mutationFn: () => adminApi.publishCohort(cohortId),
    onSuccess: invalidate,
  })
  const unpublish = useMutation({
    mutationFn: () => adminApi.unpublishCohort(cohortId),
    onSuccess: invalidate,
    onError: (err: any) => setActionError(err.response?.data?.error ?? 'Could not revert to draft.'),
  })
  const removeCohort = useMutation({
    mutationFn: () => adminApi.deleteCohort(cohortId),
    onSuccess: () => navigate('/admin/cohorts'),
    onError: (err: any) => setActionError(err.response?.data?.error ?? 'Could not delete cohort.'),
  })

  function confirmDeleteCohort(name: string, live: boolean) {
    const warn = live
      ? '\n\nThis cohort is published — deleting it also permanently removes every enrolled student’s progress and submissions.'
      : ''
    if (window.confirm(`Delete "${name}" and all of its content?${warn}\n\nThis cannot be undone.`))
      removeCohort.mutate()
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (!cohort) return <div className="p-8 text-sm text-destructive">Cohort not found.</div>

  if (isMobile) {
    const canGoBack = selectedWeekId !== null
    return (
      <div className="pb-8">
        <div className="flex items-center gap-2 border-b bg-card px-4 py-3">
          {canGoBack ? (
            <button
              onClick={() => (selectedDayId ? setSelectedDayId(null) : setSelectedWeekId(null))}
              aria-label="Back"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : (
            <Link
              to="/admin/cohorts"
              aria-label="Back to cohorts"
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{cohort.name}</div>
          </div>
          <Badge className={statusBadge[cohort.status]}>{cohort.status}</Badge>
        </div>

        {selectedDay ? (
          <DayEditor
            day={selectedDay}
            onSave={invalidate}
            onAddTask={(title) => addTask.mutate({ dayId: selectedDay.id, title })}
            onDeleteTask={(taskId) => deleteTask.mutate(taskId)}
            onDelete={() => deleteDay.mutate(selectedDay.id)}
          />
        ) : selectedWeek ? (
          <>
            <WeekEditor week={selectedWeek} cohortId={cohortId} onSave={invalidate}
              canDelete={true}
              onDelete={() => deleteWeek.mutate(selectedWeek.id)} />
            <div className="px-4 pb-4">
              <h3 className="mb-2 text-sm font-semibold">Days</h3>
              <div className="space-y-2">
                {selectedWeek.days.map((d) => (
                  <button key={d.id} onClick={() => setSelectedDayId(d.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--du-border)] bg-card p-3.5 text-left">
                    <span className="min-w-0 truncate text-sm">
                      <span className="font-semibold">Day {d.dayNumber}</span>
                      {d.title && <span className="ml-2 text-muted-foreground">{d.title}</span>}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
                <div className="flex items-center gap-1.5 px-1 py-2 text-xs font-medium text-muted-foreground">
                  {selectedWeek.assignments.length > 0
                    ? <><CheckCircle2 className="size-3.5 text-emerald-600" /> Weekly assignment set (edit above)</>
                    : <>Add the weekly assignment in the panel above</>}
                </div>
                {selectedWeek.days.length < 7 && (
                  <Button variant="outline" size="sm" className="w-full border-dashed text-muted-foreground"
                    onClick={() => addDay.mutate(selectedWeek.id)} disabled={addDay.isPending}>
                    <Plus className="size-4" /> Add day
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4 p-4">
            {actionError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                <AlertCircle className="size-4 shrink-0" />
                <span className="flex-1">{actionError}</span>
                <button onClick={() => setActionError('')} aria-label="Dismiss"><X className="size-4" /></button>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {cohort.status === 'Draft'
                ? cohort.weeks.length > 0 && (
                    <Button size="sm" className={cn(greenBtn, 'w-full')}
                      onClick={() => publish.mutate()} disabled={publish.isPending}>
                      <Rocket className="size-4" /> {publish.isPending ? 'Publishing…' : 'Publish cohort'}
                    </Button>
                  )
                : (
                    <Button variant="outline" size="sm" className="w-full"
                      onClick={() => unpublish.mutate()} disabled={unpublish.isPending}>
                      <RotateCcw className="size-4" /> {unpublish.isPending ? 'Reverting…' : 'Unpublish (revert to draft)'}
                    </Button>
                  )}
              <Button variant="outline" size="sm"
                className="w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                disabled={removeCohort.isPending}
                onClick={() => confirmDeleteCohort(cohort.name, cohort.status !== 'Draft')}>
                <Trash2 className="size-4" /> Delete cohort
              </Button>
            </div>
            <div className="space-y-2">
              {cohort.weeks.map((w) => (
                <button key={w.id} onClick={() => { setSelectedWeekId(w.id); setSelectedDayId(null) }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--du-border)] bg-card p-4 text-left">
                  <span className="min-w-0">
                    <span className="block font-semibold">Week {w.weekNumber}</span>
                    <span className="block truncate text-xs text-muted-foreground">{w.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                      {w.days.length} {w.days.length === 1 ? 'day' : 'days'}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </span>
                </button>
              ))}
              {cohort.weeks.length < 52 && (
                <Button variant="outline" className="w-full border-dashed text-muted-foreground"
                  onClick={() => addWeek.mutate()} disabled={addWeek.isPending}>
                  <Plus className="size-4" /> Add week
                </Button>
              )}
              {cohort.weeks.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No weeks yet. Add your first week.</p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 border-b bg-card px-6 py-3">
        <Link to="/admin/cohorts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" />
          Cohorts
        </Link>
        <span className="text-border">/</span>
        <h1 className="text-sm font-semibold">{cohort.name}</h1>
        <Badge className={statusBadge[cohort.status]}>{cohort.status}</Badge>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm"
            onClick={() => addWeek.mutate()}
            disabled={addWeek.isPending || cohort.weeks.length >= 52}>
            <Plus className="size-4" />
            Add week
          </Button>

          {cohort.status === 'Draft'
            ? cohort.weeks.length > 0 && (
                <Button size="sm" className={greenBtn}
                  onClick={() => publish.mutate()} disabled={publish.isPending}>
                  <Rocket className="size-4" />
                  {publish.isPending ? 'Publishing…' : 'Publish'}
                </Button>
              )
            : (
                <Button variant="outline" size="sm"
                  onClick={() => unpublish.mutate()} disabled={unpublish.isPending}>
                  <RotateCcw className="size-4" />
                  {unpublish.isPending ? 'Reverting…' : 'Unpublish'}
                </Button>
              )}

          <Button variant="outline" size="sm"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            disabled={removeCohort.isPending}
            onClick={() => confirmDeleteCohort(cohort.name, cohort.status !== 'Draft')}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </header>

      {actionError && (
        <div className="flex items-center gap-2 border-b bg-red-50 px-6 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="size-4 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError('')} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Week list */}
        <aside className="flex w-56 shrink-0 flex-col border-r bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weeks</p>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {cohort.weeks.length}
            </span>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
            {cohort.weeks.map((w) => {
              const active = selectedWeekId === w.id
              return (
                <div key={w.id}
                  className={cn(
                    'group flex items-center rounded-lg pr-1 transition-colors',
                    active ? 'bg-[var(--primary-light)]' : 'hover:bg-muted',
                  )}>
                  <button
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      active ? 'text-[var(--du-primary)]' : 'text-muted-foreground group-hover:text-foreground',
                    )}
                    onClick={() => { setSelectedWeekId(w.id); setSelectedDayId(null) }}>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-tight">Week {w.weekNumber}</span>
                      {w.title && <span className="block truncate text-xs font-normal text-muted-foreground">{w.title}</span>}
                    </span>
                    <span className="shrink-0 rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                      {w.days.length}d
                    </span>
                  </button>
                  <button
                    aria-label={`Delete Week ${w.weekNumber}`}
                    disabled={deleteWeek.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete Week ${w.weekNumber} and all of its content? This cannot be undone.`))
                        deleteWeek.mutate(w.id)
                    }}
                    className="ml-0.5 hidden size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </aside>

        {/* Day list */}
        {selectedWeek && (
          <aside className="flex w-52 shrink-0 flex-col border-r bg-muted/30">
            <div className="border-b bg-card px-4 py-3">
              <p className="truncate text-xs font-semibold">{selectedWeek.title}</p>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
              {selectedWeek.days.map((d) => (
                <div key={d.id}
                  className={cn(
                    'group flex items-center rounded-lg pr-1 transition-colors',
                    selectedDayId === d.id ? 'bg-[var(--primary-light)]' : 'hover:bg-muted',
                  )}>
                  <button
                    className={cn(
                      'flex-1 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      selectedDayId === d.id ? 'font-medium text-[var(--du-primary)]' : 'text-muted-foreground group-hover:text-foreground',
                    )}
                    onClick={() => setSelectedDayId(d.id)}>
                    Day {d.dayNumber}
                  </button>
                  <button
                    aria-label={`Delete Day ${d.dayNumber}`}
                    disabled={deleteDay.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete Day ${d.dayNumber} and its tasks? This cannot be undone.`))
                        deleteDay.mutate(d.id)
                    }}
                    className="ml-0.5 hidden size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setSelectedDayId(null)}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors',
                  selectedWeek.assignments.length > 0
                    ? 'text-emerald-600 hover:bg-muted'
                    : 'text-muted-foreground hover:text-[var(--du-primary)]',
                )}>
                {selectedWeek.assignments.length > 0
                  ? <><CheckCircle2 className="size-3.5" /> Weekly assignment</>
                  : <><Plus className="size-3.5" /> Add assignment</>}
              </button>
            </div>
            {selectedWeek.days.length < 7 && (
              <div className="p-2">
                <Button variant="outline" size="sm"
                  className="w-full border-dashed text-muted-foreground"
                  onClick={() => addDay.mutate(selectedWeek.id)} disabled={addDay.isPending}>
                  <Plus className="size-4" />
                  Add day
                </Button>
              </div>
            )}
          </aside>
        )}

        {/* Editor */}
        <main className="flex-1 overflow-y-auto">
          {selectedDay ? (
            <DayEditor
              day={selectedDay}
              onSave={invalidate}
              onAddTask={(title) => addTask.mutate({ dayId: selectedDay.id, title })}
              onDeleteTask={(taskId) => deleteTask.mutate(taskId)}
              onDelete={() => deleteDay.mutate(selectedDay.id)}
            />
          ) : selectedWeek ? (
            <WeekEditor week={selectedWeek} cohortId={cohortId} onSave={invalidate}
              canDelete={true}
              onDelete={() => deleteWeek.mutate(selectedWeek.id)} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a week to start editing
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// ── Week editor ───────────────────────────────────────────────────────────────

function WeekEditor({ week, cohortId, onSave, canDelete, onDelete }: {
  week: WeekItem; cohortId: number; onSave: () => void
  canDelete: boolean; onDelete: () => void
}) {
  const [title, setTitle] = useState(week.title)
  const [description, setDescription] = useState(week.description ?? '')

  // Reset local fields when switching between weeks
  const [editingId, setEditingId] = useState(week.id)
  if (editingId !== week.id) {
    setEditingId(week.id)
    setTitle(week.title)
    setDescription(week.description ?? '')
  }

  const save = useMutation({
    mutationFn: () => adminApi.updateWeek(cohortId, week.id, { title, description }),
    onSuccess: onSave,
  })

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 md:p-8">
      <h2 className="text-lg font-semibold">Week {week.weekNumber}</h2>
      <div className="grid gap-1.5">
        <Label htmlFor="weekTitle">Week title</Label>
        <Input id="weekTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="weekDesc">Description</Label>
        <Textarea id="weekDesc" rows={3} value={description}
          onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button className={tealBtn} onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save week'}
        </Button>
        {canDelete && (
          <Button variant="ghost" size="sm"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              if (window.confirm(`Delete Week ${week.weekNumber} and all of its content? This cannot be undone.`))
                onDelete()
            }}>
            <Trash2 className="size-4" />
            Delete week
          </Button>
        )}
      </div>

      <AssignmentEditor week={week} cohortId={cohortId} onSave={onSave} />
    </div>
  )
}

// ── Assignment editor ─────────────────────────────────────────────────────────

function AssignmentEditor({ week, cohortId, onSave }: {
  week: WeekItem; cohortId: number; onSave: () => void
}) {
  const assignment = week.assignments[0] ?? null

  const [title, setTitle] = useState(assignment?.title ?? 'Weekly Assignment')
  const [question, setQuestion] = useState(assignment?.description ?? '')
  const [allowsFileUpload, setAllowsFileUpload] = useState(assignment?.allowsFileUpload ?? true)

  // Reset local fields when switching between weeks (or when the assignment loads)
  const [editingId, setEditingId] = useState(week.id)
  if (editingId !== week.id) {
    setEditingId(week.id)
    setTitle(assignment?.title ?? 'Weekly Assignment')
    setQuestion(assignment?.description ?? '')
    setAllowsFileUpload(assignment?.allowsFileUpload ?? true)
  }

  const save = useMutation({
    mutationFn: () =>
      assignment
        ? adminApi.updateAssignment(assignment.id, { title: title.trim(), description: question.trim(), allowsFileUpload })
        : adminApi.addAssignment(cohortId, week.id, { title: title.trim(), description: question.trim(), allowsFileUpload }),
    onSuccess: onSave,
  })

  const canSave = title.trim().length > 0 && question.trim().length > 0 && !save.isPending

  return (
    <div className="space-y-4 rounded-xl border border-[var(--du-border)] bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Weekly assignment</h3>
        {assignment
          ? <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="size-3" /> Set</Badge>
          : <Badge className="bg-muted text-muted-foreground">Not added yet</Badge>}
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">
        This is the reflection question students answer at the end of the week. They must submit it to unlock the next week.
      </p>

      <div className="grid gap-1.5">
        <Label htmlFor="asgnTitle">Title</Label>
        <Input id="asgnTitle" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Week 1 Reflection" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="asgnQuestion">Question / prompt</Label>
        <Textarea id="asgnQuestion" rows={4} value={question} onChange={(e) => setQuestion(e.target.value)}
          placeholder="Write the question or prompt students should respond to…" />
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <Checkbox checked={allowsFileUpload} onCheckedChange={(v) => setAllowsFileUpload(v === true)} />
        Allow students to attach a file
      </label>

      <div className="border-t pt-3">
        <Button className={tealBtn} onClick={() => save.mutate()} disabled={!canSave}>
          {save.isPending ? 'Saving…' : assignment ? 'Save assignment' : 'Add assignment'}
        </Button>
      </div>
    </div>
  )
}

// ── Day editor ────────────────────────────────────────────────────────────────

function DayEditor({ day, onSave, onAddTask, onDeleteTask, onDelete }: {
  day: DayItem
  onSave: () => void
  onAddTask: (title: string) => void
  onDeleteTask: (id: number) => void
  onDelete: () => void
}) {
  const [fields, setFields] = useState({
    title: day.title,
    devotionText: day.devotionText,
    scriptureReference: day.scriptureReference ?? '',
    scriptureText: day.scriptureText ?? '',
  })
  const [newTask, setNewTask] = useState('')

  // Reset local fields when switching between days
  const [editingId, setEditingId] = useState(day.id)
  if (editingId !== day.id) {
    setEditingId(day.id)
    setFields({
      title: day.title,
      devotionText: day.devotionText,
      scriptureReference: day.scriptureReference ?? '',
      scriptureText: day.scriptureText ?? '',
    })
    setNewTask('')
  }

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
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Day {day.dayNumber}</h2>
        <Button variant="ghost" size="sm"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            if (window.confirm(`Delete Day ${day.dayNumber} and its tasks? This cannot be undone.`))
              onDelete()
          }}>
          <Trash2 className="size-4" />
          Delete day
        </Button>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="dayTitle">Day title</Label>
          <Input id="dayTitle" value={fields.title}
            onChange={(e) => setFields({ ...fields, title: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="devotion">Devotion text</Label>
          <Textarea id="devotion" rows={8} value={fields.devotionText}
            onChange={(e) => setFields({ ...fields, devotionText: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="scriptureRef">Scripture reference</Label>
            <Input id="scriptureRef" placeholder="e.g. John 3:16" value={fields.scriptureReference}
              onChange={(e) => setFields({ ...fields, scriptureReference: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="scriptureText">Scripture text</Label>
            <Input id="scriptureText" value={fields.scriptureText}
              onChange={(e) => setFields({ ...fields, scriptureText: e.target.value })} />
          </div>
        </div>
        <Button className={cn(tealBtn, 'w-fit')} onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save day'}
        </Button>
      </div>

      {/* Tasks */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Tasks</h3>
        <div className="mb-3 space-y-2">
          {day.tasks.map((t) => (
            <div key={t.id}
              className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
              <span className="text-sm">{t.title}</span>
              <Button variant="ghost" size="icon-sm" aria-label="Remove task"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onDeleteTask(t.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {day.tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Input value={newTask} placeholder="Add a task…"
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()} />
          <Button variant="secondary" onClick={handleAddTask}>Add</Button>
        </div>
      </div>
    </div>
  )
}
