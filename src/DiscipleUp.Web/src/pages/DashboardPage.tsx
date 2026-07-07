import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { studentsApi, type WeekCard } from '@/api/students'

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
    <svg width="140" height="140" viewBox="0 0 150 150" style={{ filter: 'drop-shadow(0 0 16px rgba(167,139,250,.35))' }}>
      <defs>
        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#F9A8D4" />
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
    ? { ...base, background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '1.5px solid #A7F3D0' }
    : isCurrent
    ? { ...base, background: 'linear-gradient(135deg,var(--primary-pale),var(--primary-light))', border: '2px solid var(--primary)' }
    : { ...base, background: 'var(--locked-bg)', border: '1.5px solid var(--border)', opacity: isLocked ? 0.7 : 1 }

  const pct = Math.round((week.daysCompleted / 7) * 100)

  return (
    <div style={cardStyle}
      onClick={() => !isLocked && navigate(`/week/${week.weekNumber}`, { state: { cohortId } })}
      onMouseEnter={e => { if (!isLocked) (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4, color: isDone ? 'var(--green)' : isCurrent ? 'var(--primary)' : 'var(--locked)' }}>
        Week {week.weekNumber} {isDone ? '✓' : isCurrent ? '· Now' : '· Locked'}
      </div>
      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14, color: isLocked ? 'var(--locked)' : 'var(--text)', marginBottom: 8 }}>{week.title}</div>
      <div style={{ height: 5, background: 'rgba(0,0,0,.08)', borderRadius: 10, marginBottom: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 10, width: `${pct}%`, background: isDone ? 'var(--green)' : 'var(--primary)' }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, color: isDone ? 'var(--green-text)' : isCurrent ? 'var(--primary)' : 'var(--locked)' }}>
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

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => studentsApi.getDashboard().then(r => r.data),
  })

  const { data: journey } = useQuery({
    queryKey: ['journey'],
    queryFn: () => studentsApi.getJourney().then(r => r.data),
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
    onSettled: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
  })

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '4px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const cohort  = data?.cohort
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
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px 0', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>Dashboard</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <button className="du-btn du-btn-outline du-btn-sm" onClick={() => navigate('/journey')}>
          <i className="ti ti-route" /> Full journey
        </button>
      </div>

      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg,#2D1B69 0%,#5B21B6 50%,#7C3AED 100%)',
        margin: '0 32px 24px', borderRadius: 20, padding: '28px 32px',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        overflow: 'hidden', position: 'relative',
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
              cohort     && { icon: 'ti-calendar', label: `Week ${cohort.currentWeek} of 4` },
              total > 0  && { icon: 'ti-check', label: `${total} tasks done` },
            ].filter(Boolean).map((p: any, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.15)', backdropFilter: 'blur(4px)', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.85)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`ti ${p.icon}`} style={{ fontSize: 14, color: p.iconColor }} />{p.label}
              </div>
            ))}
          </div>
        </div>

        {/* Arc */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, zIndex: 1 }}>
          <ArcProgress day={cohort?.dayOfJourney ?? 0} total={28} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[{ val: streak, lbl: 'Day streak' }, { val: total, lbl: 'Tasks done' }].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22, color: '#fff' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 1 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stat boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, zIndex: 1 }}>
          {[
            { val: streak, lbl: 'Day streak',     note: streak === longest && streak > 0 ? 'Personal best!' : `Best: ${longest}`, warm: true },
            { val: tasks.length - done, lbl: 'Tasks left', note: `${done} of ${tasks.length} done`, warm: false },
            { val: cohort ? Math.max(0, 28 - cohort.dayOfJourney) : '—', lbl: 'Days remaining', note: cohort ? `On Day ${cohort.dayOfJourney}` : 'Not enrolled', warm: true },
            { val: data?.recentBadges.length ?? 0, lbl: 'Badges earned', note: 'Keep going!', warm: false },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(4px)' }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22, color: '#fff' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>{s.lbl}</div>
              <div style={{ fontSize: 11, color: s.warm ? '#FCD34D' : '#A7F3D0', marginTop: 6 }}>{s.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks + Streak row */}
      <div style={{ padding: '0 32px', display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 20, marginBottom: 20 }}>
        {/* Today's tasks */}
        <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>Today's tasks</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
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
            <p style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 0' }}>
              {cohort ? 'No tasks yet — content is being prepared.' : 'Ask your admin to enrol you in a cohort.'}
            </p>
          ) : (
            tasks.map(task => (
              <div key={task.id}
                onClick={() => !task.isCompleted && completeTask.mutate(task.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border)', cursor: task.isCompleted ? 'default' : 'pointer' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  border: `2px solid ${task.isCompleted ? 'var(--green)' : 'var(--border-strong)'}`,
                  background: task.isCompleted ? 'var(--green)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
                }}>
                  {task.isCompleted && <i className="ti ti-check" style={{ color: '#fff', fontSize: 13 }} />}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: task.isCompleted ? 'var(--muted)' : 'var(--text)', textDecoration: task.isCompleted ? 'line-through' : 'none' }}>
                  {task.title}
                </div>
                {task.isCompleted && <span className="pill pill-green">Done</span>}
              </div>
            ))
          )}
        </div>

        {/* Streak card */}
        <div style={{ background: 'linear-gradient(135deg,#FFFBEB,#FEF3C7)', border: '1.5px solid #FCD34D', borderRadius: 'var(--radius)', padding: '22px 24px' }}>
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
                <div key={i} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: filled ? 'var(--gold)' : isToday ? 'var(--primary)' : 'var(--border)', color: filled || isToday ? '#fff' : 'var(--muted)' }}>
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

      {/* Journey overview mini cards */}
      <div style={{ padding: '0 32px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Journey overview</div>
          <button className="du-btn du-btn-outline du-btn-sm" onClick={() => navigate('/journey')}>
            <i className="ti ti-route" /> Full journey
          </button>
        </div>
        {weeks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>No cohort content available yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {weeks.map(w => (
              <MiniWeekCard key={w.weekId} week={w} cohortId={cId} isCurrent={w.weekNumber === cohort?.currentWeek} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
