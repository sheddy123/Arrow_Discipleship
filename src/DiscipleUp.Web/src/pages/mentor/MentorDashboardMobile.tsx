import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Users, FileText, ClipboardList, Send } from 'lucide-react'
import { mentorsApi, type MentorStudentRow } from '@/api/mentors'
import { useMentorCohort } from '@/hooks/useMentorCohort'
import { PageSkeleton, EmptyState } from '@/components/Skeleton'
import { Combobox } from '@/components/ui/combobox'

type Tone = 'green' | 'amber' | 'red'
const toneColor: Record<Tone, string> = {
  green: 'var(--green)',
  amber: 'var(--gold)',
  red: 'var(--coral)',
}

function studentStatus(s: MentorStudentRow): { label: string; tone: Tone } {
  if (s.atRisk) return { label: 'behind schedule', tone: 'red' }
  if (s.currentStreak === 0) return { label: 'streak broken', tone: 'amber' }
  return { label: `${s.currentStreak}-day streak`, tone: 'green' }
}

export default function MentorDashboardMobile() {
  const navigate = useNavigate()
  const { cohorts, cohort, isLoading: cohortsLoading, selectCohort } = useMentorCohort()
  const [message, setMessage] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['mentor-dashboard', cohort?.id],
    queryFn: () => mentorsApi.getDashboard(cohort!.id).then((r) => r.data),
    enabled: !!cohort,
  })

  const announce = useMutation({
    mutationFn: () =>
      mentorsApi.createAnnouncement(cohort!.id, message.trim().slice(0, 60) || 'Announcement', message.trim()),
    onSuccess: () => setMessage(''),
  })

  if (cohortsLoading || (cohort && isLoading)) return <PageSkeleton variant="table" />

  if (!cohort) return (
    <EmptyState icon="ti-users-group" title="No cohort assigned"
      message="You aren't leading a cohort yet. Once an admin assigns you one, your students will appear here." />
  )

  const students = data?.students ?? []
  const pending = data?.cohort.pendingSubmissions ?? 0

  return (
    <div className="min-h-full bg-[var(--bg)] pb-10">
      {/* Header */}
      <div className="px-4 pt-5">
        <h1 className="font-[Sora,sans-serif] text-2xl font-extrabold text-[var(--text)]">Mentor Dashboard</h1>
        <p className="mt-0.5 text-sm text-[var(--du-muted)]">
          {cohort.name} · {data?.cohort.studentCount ?? 0} students
        </p>
        {cohorts.length > 1 && (
          <Combobox
            options={cohorts.map((c) => ({ value: String(c.id), label: c.name }))}
            value={String(cohort.id)}
            onValueChange={(v) => v && selectCohort(Number(v))}
            placeholder="Search cohort…"
            emptyText="No cohorts found."
            className="mt-3"
          />
        )}
      </div>

      {/* Stat cards */}
      <div className="mt-4 grid grid-cols-2 gap-3 px-4">
        <StatCard icon={Users} value={data?.cohort.studentCount ?? 0} label="Students"
          note={`${data?.onTrackCount ?? 0} on track`} color="var(--du-primary)" bg="var(--primary-light)" />
        <StatCard icon={FileText} value={pending} label="Pending reviews"
          note={`${data?.atRiskCount ?? 0} need attention`} color="var(--gold-text)" bg="var(--gold-bg)" />
      </div>

      {/* Assignments-waiting banner */}
      {pending > 0 && (
        <button
          onClick={() => navigate(`/mentor/review?cohortId=${cohort.id}`)}
          className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl border-[1.5px] border-[var(--gold)] bg-[var(--gold-bg)] p-3.5 text-left"
        >
          <ClipboardList className="size-5 shrink-0 text-[var(--gold-text)]" />
          <span className="flex-1 text-sm font-semibold text-[var(--gold-text)]">
            {pending} assignment{pending === 1 ? '' : 's'} waiting for your review
          </span>
          <span className="flex size-6 items-center justify-center rounded-full bg-[var(--gold)] text-xs font-bold text-white">
            {pending}
          </span>
        </button>
      )}

      {/* Student progress */}
      <div className="mt-5 px-4">
        <h2 className="font-[Sora,sans-serif] text-base font-bold text-[var(--text)]">Student progress</h2>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--du-muted)]">
          <Legend tone="green" label="On track" />
          <Legend tone="amber" label="Needs check-in" />
          <Legend tone="red" label="Behind" />
        </div>

        <div className="mt-3 space-y-2">
          {students.length === 0 ? (
            <p className="rounded-xl border border-[var(--du-border)] bg-[var(--du-card)] p-4 text-sm text-[var(--du-muted)]">
              No students enrolled yet.
            </p>
          ) : (
            students.map((s) => {
              const day = (s.currentWeek - 1) * 7 + s.currentDay
              const pct = s.totalTasks ? Math.round((s.tasksCompleted / s.totalTasks) * 100) : 0
              const { label, tone } = studentStatus(s)
              return (
                <button
                  key={s.studentId}
                  onClick={() => navigate(`/mentor/students/${s.studentId}?cohortId=${cohort.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--du-border)] bg-[var(--du-card)] p-3 text-left transition-colors active:bg-[var(--primary-pale)]"
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl font-[Sora,sans-serif] text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,var(--primary-mid),var(--du-primary))' }}
                  >
                    {s.firstName[0]}{s.lastName[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--text)]">
                      {s.firstName} {s.lastName}
                    </div>
                    <div className="truncate text-xs text-[var(--du-muted)]">Day {day} · {label}</div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--du-border)]">
                        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: toneColor[tone] }} />
                      </span>
                      <span className="w-9 shrink-0 text-right text-xs font-semibold text-[var(--du-muted)]">{pct}%</span>
                    </div>
                  </div>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: toneColor[tone] }} />
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Send announcement */}
      <div className="mt-5 px-4">
        <div className="rounded-2xl border border-[var(--du-border)] bg-[var(--du-card)] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Send className="size-4 text-[var(--du-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--text)]">Send announcement to cohort</h3>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder={`Write a message to all ${data?.cohort.studentCount ?? ''} students…`}
            className="w-full resize-none rounded-lg border border-[var(--du-border)] bg-transparent p-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--du-muted)] focus:border-[var(--du-primary)]"
          />
          <button
            onClick={() => announce.mutate()}
            disabled={!message.trim() || announce.isPending}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--du-primary)] py-2.5 text-sm font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-50"
          >
            <Send className="size-4" />
            {announce.isPending ? 'Sending…' : announce.isSuccess ? 'Sent ✓' : 'Send announcement'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, note, color, bg }: {
  icon: React.ComponentType<{ className?: string }>
  value: number | string; label: string; note: string; color: string; bg: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--du-border)] bg-[var(--du-card)] p-4" style={{ boxShadow: 'var(--shadow)' }}>
      <span className="mb-2 flex size-9 items-center justify-center rounded-xl" style={{ background: bg, color }}>
        <Icon className="size-[18px]" />
      </span>
      <div className="font-[Sora,sans-serif] text-2xl font-extrabold text-[var(--text)]">{value}</div>
      <div className="text-xs text-[var(--du-muted)]">{label}</div>
      <div className="mt-1 text-[11px] font-medium" style={{ color }}>{note}</div>
    </div>
  )
}

function Legend({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: toneColor[tone] }} />
      {label}
    </span>
  )
}
