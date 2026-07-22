import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { studentsApi, type WeekCard } from '@/api/students'
import { celebrateXp } from '@/lib/celebrate'
import DailyQuests from '@/components/DailyQuests'
import { PageSkeleton } from '@/components/Skeleton'
import { useIsMobile } from '@/hooks/useIsMobile'
import StudentDashboardMobile from '@/pages/student/StudentDashboardMobile'

function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

function ArcProgress({ day, total }: { day: number; total: number }) {
  const pct = Math.min(day / total, 1)
  const r = 62
  const circ = 2 * Math.PI * r
  const offset = circ - pct * circ
  return (
    <svg width="140" height="140" viewBox="0 0 150 150" style={{ filter: 'drop-shadow(0 0 16px rgba(34,211,238,.35))' }}>
      <defs>
        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#A5F3FC" />
          <stop offset="100%" stopColor="#F5C36B" />
        </linearGradient>
      </defs>
      <circle cx="75" cy="75" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="11" strokeLinecap="round" />
      <circle cx="75" cy="75" r={r} fill="none" stroke="url(#arcGrad)" strokeWidth="11" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transformOrigin: 'center', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 1s ease-out' }} />
      <text x="75" y="68" fontFamily="Sora,sans-serif" fontSize="32" fontWeight="800" fill="white" textAnchor="middle">{day}</text>
      <text x="75" y="88" fontFamily="Inter,sans-serif" fontSize="11" fill="rgba(255,255,255,0.6)" textAnchor="middle">of {total} days</text>
      <text x="75" y="106" fontFamily="Inter,sans-serif" fontSize="11" fill="rgba(255,255,255,0.45)" textAnchor="middle">{Math.round(pct * 100)}% complete</text>
    </svg>
  )
}

function MiniWeekCard({ week, cohortId, isCurrent }: { week: WeekCard; cohortId: number; isCurrent: boolean }) {
  const navigate = useNavigate()
  const isLocked = week.status === 'Locked'
  const isDone   = week.status === 'Completed'

  const base: React.CSSProperties = { borderRadius: 14, padding: '16px 18px', cursor: isLocked ? 'default' : 'pointer', transition: 'transform .15s', overflow: 'hidden' }
  const cardStyle: React.CSSProperties = isDone
    ? { ...base, background: 'var(--surface-done-bg)', border: '1.5px solid var(--surface-done-border)' }
    : isCurrent
    ? { ...base, background: 'var(--surface-current-bg)', border: '2px solid var(--surface-current-border)' }
    : { ...base, background: 'var(--locked-bg)', border: '1.5px solid var(--du-border)', opacity: isLocked ? 0.7 : 1 }

  const pct = Math.round((week.daysCompleted / 7) * 100)

  return (
    <div style={cardStyle}
      onClick={() => !isLocked && navigate(`/week/${week.weekNumber}`, { state: { cohortId } })}
      onMouseEnter={e => { if (!isLocked) (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4, color: isDone ? 'var(--green)' : isCurrent ? 'var(--du-primary)' : 'var(--locked)' }}>
        Week {week.weekNumber} {isDone ? '✓' : isCurrent ? '· Now' : '· Locked'}
      </div>
      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14, color: isLocked ? 'var(--locked)' : 'var(--text)', marginBottom: 8 }}>{week.title}</div>
      <div style={{ height: 5, background: 'var(--track)', borderRadius: 10, marginBottom: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 10, width: `${pct}%`, background: isDone ? 'var(--green)' : 'var(--du-primary)' }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, color: isDone ? 'var(--green-text)' : isCurrent ? 'var(--du-primary)' : 'var(--locked)' }}>
        {isLocked
          ? <><i className="ti ti-lock" style={{ fontSize: 12 }} /> Complete previous week first</>
          : <><i className={isDone ? 'ti ti-check' : 'ti ti-bolt'} style={{ fontSize: 12 }} />{week.daysCompleted}/7 days · {week.hasAssignment ? (week.assignmentSubmitted ? '1/1 assignment' : '0/1 assignment') : 'No assignment'}</>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isMobile = useIsMobile()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => studentsApi.getDashboard().then(r => r.data),
  })

  const { data: journey } = useQuery({
    queryKey: ['journey'],
    queryFn: () => studentsApi.getJourney().then(r => r.data),
    enabled: !!data?.cohort,
  })

  const { data: announcements } = useQuery({
    queryKey: ['student-announcements'],
    queryFn: () => studentsApi.getAnnouncements().then(r => r.data),
    enabled: !!data?.cohort,
  })

  const completeTask = useMutation({
    mutationFn: (taskId: number) => studentsApi.completeTask(data!.cohort!.id, taskId),
    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: ['dashboard'] })
      const prev = qc.getQueryData(['dashboard'])
      qc.setQueryData(['dashboard'], (old: any) => ({
        ...old,
        todaysTasks: old.todaysTasks.map((t: any) => t.id === taskId ? { ...t, isCompleted: true } : t),
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

  if (isMobile) return <StudentDashboardMobile />
  if (isLoading) return <PageSkeleton variant="dashboard" />


  const cohort  = data?.cohort
  const level   = data?.level
  const tasks   = data?.todaysTasks ?? []
  const done    = tasks.filter(t => t.isCompleted).length
  const streak  = data?.currentStreak ?? 0
  const longest = data?.longestStreak  ?? 0
  const total   = data?.totalTasksCompleted ?? 0
  const weeks   = journey && 'weeks' in journey ? (journey as any).weeks as WeekCard[] : []
  const cId     = journey && 'cohortId' in journey ? (journey as any).cohortId as number : 0

  const DAY_LETTERS = ['M','T','W','T','F','S','S']
  const jsDay = new Date().getDay()
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1

  return (
    <>
      {/* Top bar */}
      <div className="du-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px 0', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>Dashboard</div>
          <div style={{ fontSize: 13, color: 'var(--du-muted)', marginTop: 3 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <button className="du-btn du-btn-outline du-btn-sm" onClick={() => navigate('/journey')}>
          <i className="ti ti-route" /> Full journey
        </button>
      </div>

      {/* Hero banner */}
      <div className="du-hero" style={{
        background: 'linear-gradient(135deg,#0C2430 0%,#0E7490 55%,#0891B2 100%)',
        margin: '0 32px 24px', borderRadius: 20, padding: '28px 32px',
        color: '#fff', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,.06)' }} />
        <div style={{ position: 'absolute', right: 80, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,.04)' }} />

        {/* Greeting + pills */}
        <div style={{ zIndex: 1 }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', fontWeight: 500, marginBottom: 4 }}>{greet()}</div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 28, marginBottom: 16 }}>
            {user?.firstName} {user?.lastName} 👋
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              streak > 0 && { icon: 'ti-flame', iconColor: '#FCD34D', label: `${streak}-day streak` },
              cohort     && { icon: 'ti-calendar', label: `Week ${cohort.currentWeek} of ${cohort.totalWeeks}` },
              total > 0  && { icon: 'ti-check', label: `${total} tasks done` },
            ].filter(Boolean).map((p: any, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.15)', backdropFilter: 'blur(4px)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.85)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`ti ${p.icon}`} style={{ fontSize: 14, color: p.iconColor }} />{p.label}
              </div>
            ))}
          </div>

          {/* XP / level progress */}
          {level && (
            <div style={{ marginTop: 18, maxWidth: 420 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 13 }}>
                  <span style={{ color: '#FCD34D' }}>⚡ Level {level.level}</span>
                  <span style={{ color: 'rgba(255,255,255,.65)', fontWeight: 500 }}> · {level.title}</span>
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>{level.xpIntoLevel} / {level.xpForNextLevel} XP</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,.15)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, Math.round((level.xpIntoLevel / level.xpForNextLevel) * 100))}%`, background: 'linear-gradient(90deg,#FCD34D,#F97316)', borderRadius: 10, transition: 'width .6s ease-out' }} />
              </div>
            </div>
          )}
        </div>

        {/* Arc + stat boxes */}
        <div className="du-hero-stats" style={{ zIndex: 1 }}>
          <ArcProgress day={cohort?.dayOfJourney ?? 0} total={cohort?.totalDays ?? 28} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1, minWidth: 220 }}>
            {[
              { val: streak, lbl: 'Day streak',     note: streak === longest && streak > 0 ? 'Personal best!' : `Best: ${longest}`, warm: true },
              { val: tasks.length - done, lbl: 'Tasks left', note: `${done} of ${tasks.length} done`, warm: false },
              { val: cohort ? Math.max(0, cohort.totalDays - cohort.dayOfJourney) : '—', lbl: 'Days remaining', note: cohort ? `On Day ${cohort.dayOfJourney}` : 'Not enrolled', warm: true },
              { val: data?.recentBadges.length ?? 0, lbl: 'Badges earned', note: 'Keep going!', warm: false },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(4px)' }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22, color: '#fff' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>{s.lbl}</div>
                <div style={{ fontSize: 11, color: s.warm ? '#FCD34D' : '#5EEAD4', marginTop: 6 }}>{s.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily quests */}
      <div className="du-pad" style={{ padding: '0 32px', marginBottom: 20 }}>
        <DailyQuests />
      </div>

      {/* Tasks + Streak row */}
      <div className="du-grid-2 du-pad" style={{ padding: '0 32px', gridTemplateColumns: '2fr 1.2fr', gap: 20, marginBottom: 20 }}>
        {/* Today's tasks */}
        <div style={{ background: 'var(--du-card)', borderRadius: 'var(--du-radius)', border: '1px solid var(--du-border)', boxShadow: 'var(--shadow)', padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>Today's tasks</div>
              <div style={{ fontSize: 12, color: 'var(--du-muted)' }}>
                {cohort ? `Day ${cohort.currentDay} · ${done} of ${tasks.length} completed` : 'Enrol in a cohort to begin'}
              </div>
            </div>
            {cohort && (
              <button className="du-btn du-btn-primary du-btn-sm"
                onClick={() => navigate(`/week/${cohort.currentWeek}`, { state: { cohortId: cohort.id } })}>
                <i className="ti ti-arrow-right" /> Open week
              </button>
            )}
          </div>
          {tasks.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--du-muted)', padding: '8px 0' }}>
              {cohort ? 'No tasks yet — content is being prepared.' : 'Ask your admin to enrol you in a cohort.'}
            </p>
          ) : (
            tasks.map(task => (
              <div key={task.id}
                onClick={() => !task.isCompleted && completeTask.mutate(task.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--du-border)', cursor: task.isCompleted ? 'default' : 'pointer' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  border: `2px solid ${task.isCompleted ? 'var(--green)' : 'var(--border-strong)'}`,
                  background: task.isCompleted ? 'var(--green)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
                }}>
                  {task.isCompleted && <i className="ti ti-check" style={{ color: '#fff', fontSize: 13 }} />}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: task.isCompleted ? 'var(--du-muted)' : 'var(--text)', textDecoration: task.isCompleted ? 'line-through' : 'none' }}>
                  {task.title}
                </div>
                {task.isCompleted && <span className="pill pill-green">Done</span>}
              </div>
            ))
          )}
        </div>

        {/* Streak card */}
        <div style={{ background: 'var(--surface-gold-bg)', border: '1.5px solid var(--surface-gold-border)', borderRadius: 'var(--du-radius)', padding: '22px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--gold-text)', marginBottom: 12 }}>Your streak</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 40, lineHeight: 1 }}>🔥</div>
            <div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 36, color: 'var(--gold-text)' }}>{streak} days</div>
              <div style={{ fontSize: 13, color: 'var(--gold-text)', opacity: .8, fontWeight: 500 }}>
                {streak >= 7 ? "You're on fire!" : streak > 0 ? 'Keep it up!' : 'Start today!'}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--gold-text)', marginBottom: 8 }}>This week</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {DAY_LETTERS.map((d, i) => {
              const filled = i < todayIdx && streak > todayIdx - i - 1
              const isToday = i === todayIdx
              return (
                <div key={i} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: filled ? 'var(--gold)' : isToday ? 'var(--du-primary)' : 'var(--du-border)', color: filled || isToday ? '#fff' : 'var(--du-muted)' }}>
                  {d}
                </div>
              )
            })}
          </div>
          {streak >= 6 && (
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--gold-text)', fontWeight: 500 }}>
              🏅 Unlock "7-Day Warrior" badge — keep going today!
            </div>
          )}
        </div>
      </div>

      {/* Announcements from mentors */}
      {!!announcements?.length && (
        <div className="du-pad" style={{ padding: '0 32px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <i className="ti ti-speakerphone" style={{ fontSize: 14, color: 'var(--du-primary)' }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--du-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Announcements</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {announcements.slice(0, 4).map(a => (
              <div key={a.id} style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderLeft: '3px solid var(--du-primary)', borderRadius: 12, padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--du-muted)', whiteSpace: 'nowrap' }}>{a.authorName} · {new Date(a.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--du-muted)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{a.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Journey overview mini cards */}
      <div className="du-pad" style={{ padding: '0 32px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--du-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Journey overview</div>
          <button className="du-btn du-btn-outline du-btn-sm" onClick={() => navigate('/journey')}>
            <i className="ti ti-route" /> Full journey
          </button>
        </div>
        {weeks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--du-muted)' }}>No cohort content available yet.</p>
        ) : (
          <div className="du-grid-4" style={{ gap: 16 }}>
            {weeks.map(w => (
              <MiniWeekCard key={w.weekId} week={w} cohortId={cId} isCurrent={w.weekNumber === cohort?.currentWeek} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
