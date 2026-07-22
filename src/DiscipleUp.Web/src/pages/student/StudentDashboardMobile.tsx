import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flame, Award, Trophy, Check, ArrowRight, Megaphone } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { studentsApi } from '@/api/students'
import { celebrateXp } from '@/lib/celebrate'
import DailyQuests from '@/components/DailyQuests'
import { PageSkeleton } from '@/components/Skeleton'

function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

function Ring({ day, total }: { day: number; total: number }) {
  const pct = total > 0 ? Math.min(day / total, 1) : 0
  const r = 34
  const circ = 2 * Math.PI * r
  const off = circ - pct * circ
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#A5F3FC" />
          <stop offset="100%" stopColor="#F5C36B" />
        </linearGradient>
      </defs>
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" />
      <circle cx="44" cy="44" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off}
        style={{ transformOrigin: 'center', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 1s ease-out' }} />
      <text x="44" y="42" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff" fontFamily="Sora,sans-serif">{day}</text>
      <text x="44" y="57" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,.6)">of {total} days</text>
    </svg>
  )
}

export default function StudentDashboardMobile() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => studentsApi.getDashboard().then((r) => r.data),
  })

  const { data: leaderboard } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => studentsApi.getLeaderboard().then((r) => r.data),
    enabled: !!data?.cohort,
  })

  const { data: announcements } = useQuery({
    queryKey: ['student-announcements'],
    queryFn: () => studentsApi.getAnnouncements().then((r) => r.data),
    enabled: !!data?.cohort,
  })

  const completeTask = useMutation({
    mutationFn: (taskId: number) => studentsApi.completeTask(data!.cohort!.id, taskId),
    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: ['dashboard'] })
      const prev = qc.getQueryData(['dashboard'])
      qc.setQueryData(['dashboard'], (old: any) => ({
        ...old,
        todaysTasks: old.todaysTasks.map((t: any) => (t.id === taskId ? { ...t, isCompleted: true } : t)),
      }))
      return { prev }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['dashboard'], ctx?.prev),
    onSuccess: (res) => celebrateXp(res.data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['journey'] })
    },
  })

  if (isLoading) return <PageSkeleton variant="dashboard" />

  const cohort = data?.cohort
  const level = data?.level
  const tasks = data?.todaysTasks ?? []
  const streak = data?.currentStreak ?? 0
  const badges = data?.recentBadges.length ?? 0
  const pct = cohort ? Math.round((cohort.dayOfJourney / cohort.totalDays) * 100) : 0
  const rank = leaderboard?.entries?.find((e) => e.isMe)?.rank

  const pills = [
    { icon: Flame, value: streak, label: 'Day streak', color: '#FCD34D' },
    { icon: Award, value: badges, label: badges === 1 ? 'Badge' : 'Badges', color: '#A5F3FC' },
    ...(rank ? [{ icon: Trophy, value: `#${rank}`, label: 'Rank', color: '#5EEAD4' }] : []),
  ]

  return (
    <div className="min-h-full bg-[var(--bg)] pb-8">
      {/* Hero */}
      <div
        className="relative overflow-hidden px-5 pb-6 pt-6 text-white"
        style={{ background: 'linear-gradient(140deg,#0C2430 0%,#0E7490 60%,#0891B2 100%)' }}
      >
        <div className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full bg-white/[.06]" />
        <div className="relative">
          <p className="text-sm font-medium text-white/65">{greet()}</p>
          <h1 className="mt-0.5 font-[Sora,sans-serif] text-2xl font-extrabold">
            {user?.firstName} {user?.lastName} <span aria-hidden>👋</span>
          </h1>

          <div className="mt-4 flex items-center gap-4">
            <Ring day={cohort?.dayOfJourney ?? 0} total={cohort?.totalDays ?? 28} />
            <div className="min-w-0">
              <div className="font-[Sora,sans-serif] text-3xl font-extrabold leading-none">
                {pct}<span className="text-lg">%</span>
              </div>
              <p className="mt-1 text-sm font-medium text-white/80">Journey complete</p>
              <p className="text-xs text-white/55">
                {cohort ? `Week ${cohort.currentWeek} of ${cohort.totalWeeks} · In progress` : 'Not enrolled'}
              </p>
            </div>
          </div>

          {level && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="font-[Sora,sans-serif] text-sm font-bold">
                  <span style={{ color: '#FCD34D' }}>⚡ Level {level.level}</span>
                  <span className="font-medium text-white/65"> · {level.title}</span>
                </span>
                <span className="text-[11px] text-white/60">{level.xpIntoLevel} / {level.xpForNextLevel} XP</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${Math.min(100, Math.round((level.xpIntoLevel / level.xpForNextLevel) * 100))}%`, background: 'linear-gradient(90deg,#FCD34D,#F97316)' }} />
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            {pills.map((p) => (
              <div key={p.label}
                className="rounded-xl border border-white/15 bg-white/10 px-2 py-2.5 text-center backdrop-blur-sm">
                <p.icon className="mx-auto mb-1 size-4" style={{ color: p.color }} />
                <div className="font-[Sora,sans-serif] text-base font-extrabold leading-none">{p.value}</div>
                <div className="mt-1 text-[11px] text-white/60">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Streak banner */}
        {streak > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-[#FCD34D] bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] p-4">
            <div className="text-3xl leading-none">🔥</div>
            <div className="flex-1">
              <p className="font-[Sora,sans-serif] text-base font-bold text-[var(--gold-text)]">{streak}-day streak!</p>
              <p className="text-xs font-medium text-[var(--gold-text)]/80">
                {streak >= 7 ? "You're on fire this week" : 'Keep the momentum going'}
              </p>
            </div>
            {streak >= 6 && streak < 7 && (
              <p className="max-w-[96px] text-right text-[11px] font-semibold text-[var(--gold-text)]">
                Keep it up to unlock a badge
              </p>
            )}
          </div>
        )}

        {/* Daily quests */}
        <DailyQuests compact />

        {/* Today's tasks */}
        <div>
          <h2 className="font-[Sora,sans-serif] text-lg font-bold text-[var(--text)]">
            Today{cohort ? ` — Day ${cohort.currentDay}` : ''}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--du-muted)]">
            {cohort ? 'Complete all tasks to keep your streak alive' : 'Enrol in a cohort to begin'}
          </p>

          <div className="mt-3 space-y-2">
            {tasks.length === 0 ? (
              <p className="rounded-xl border border-[var(--du-border)] bg-[var(--du-card)] p-4 text-sm text-[var(--du-muted)]">
                {cohort ? 'No tasks yet — content is being prepared.' : 'Ask your admin to enrol you in a cohort.'}
              </p>
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  disabled={task.isCompleted || completeTask.isPending}
                  onClick={() => completeTask.mutate(task.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--du-border)] bg-[var(--du-card)] p-3.5 text-left transition-colors active:bg-black/[.02] disabled:cursor-default"
                >
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors"
                    style={{
                      borderColor: task.isCompleted ? 'var(--green)' : 'var(--border-strong)',
                      background: task.isCompleted ? 'var(--green)' : 'transparent',
                    }}
                  >
                    {task.isCompleted && <Check className="size-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span
                    className="flex-1 text-sm font-medium"
                    style={{
                      color: task.isCompleted ? 'var(--du-muted)' : 'var(--text)',
                      textDecoration: task.isCompleted ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </span>
                  {task.isCompleted && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[var(--green-text)]">
                      Done <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Announcements */}
        {!!announcements?.length && (
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-[var(--du-primary)]" />
              <h2 className="font-[Sora,sans-serif] text-lg font-bold text-[var(--text)]">Announcements</h2>
            </div>
            <div className="mt-3 space-y-2">
              {announcements.slice(0, 4).map((a) => (
                <div key={a.id} className="rounded-xl border border-[var(--du-border)] border-l-[3px] border-l-[var(--du-primary)] bg-[var(--du-card)] p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-[Sora,sans-serif] text-sm font-bold text-[var(--text)]">{a.title}</p>
                    <p className="whitespace-nowrap text-[11px] text-[var(--du-muted)]">{new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-[var(--du-muted)]">{a.content}</p>
                  <p className="mt-1.5 text-[11px] text-[var(--du-muted)]">— {a.authorName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue */}
        {cohort && (
          <button
            onClick={() => navigate(`/week/${cohort.currentWeek}`, { state: { cohortId: cohort.id } })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--du-primary)] py-3.5 font-semibold text-white transition-[filter] hover:brightness-110"
          >
            Continue Week {cohort.currentWeek}
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
