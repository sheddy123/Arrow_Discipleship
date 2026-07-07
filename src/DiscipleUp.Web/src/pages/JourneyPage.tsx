import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { studentsApi, type WeekCard } from '@/api/students'

function WeekCardLarge({ week, cohortId, currentWeek, currentDay }: { week: WeekCard; cohortId: number; currentWeek: number; currentDay: number }) {
  const navigate = useNavigate()
  const isLocked  = week.status === 'Locked'
  const isDone    = week.status === 'Completed'
  const isCurrent = week.weekNumber === currentWeek

  const cardStyle: React.CSSProperties = isDone
    ? { background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', border: '1.5px solid #A7F3D0' }
    : isCurrent
    ? { background: 'linear-gradient(135deg,var(--primary-pale),var(--primary-light))', border: '2px solid var(--primary-mid)' }
    : { background: 'var(--locked-bg)', border: '1.5px solid var(--border)' }

  const pill = isDone
    ? <span className="pill pill-green"><i className="ti ti-check" style={{ fontSize: 10 }} /> Done</span>
    : isCurrent
    ? <span className="pill pill-primary"><i className="ti ti-bolt" style={{ fontSize: 10 }} /> Active</span>
    : <span className="pill pill-muted"><i className="ti ti-lock" style={{ fontSize: 10 }} /> Locked</span>

  const dayStart = (week.weekNumber - 1) * 7 + 1

  return (
    <div
      style={{ ...cardStyle, borderRadius: 18, padding: '24px 26px', cursor: isLocked ? 'default' : 'pointer', transition: 'all .18s' }}
      onClick={() => !isLocked && navigate(`/week/${week.weekNumber}`, { state: { cohortId } })}
      onMouseEnter={e => { if (!isLocked) { const el = e.currentTarget as HTMLElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 30px rgba(91,33,182,.12)' }}}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.boxShadow = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4, color: isDone ? 'var(--green)' : isCurrent ? 'var(--primary)' : 'var(--locked)' }}>
            Week {week.weekNumber} — {isDone ? 'Completed' : isCurrent ? 'In progress' : 'Locked'}
          </div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, color: isLocked ? 'var(--locked)' : 'var(--text)', marginBottom: 4 }}>
            {week.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Days {dayStart}–{dayStart + 6}</div>
        </div>
        {pill}
      </div>

      {/* Day bubbles */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const dayNum = dayStart + i
          let bg = 'rgba(255,255,255,.6)', color = 'var(--muted)', border = '1px solid var(--border)', glow = 'none'
          if (isLocked) { bg = 'var(--locked-bg)'; color = 'var(--locked)'; border = 'none' }
          else if (i < week.daysCompleted) { bg = 'var(--green)'; color = '#fff'; border = 'none' }
          else if (isCurrent && i === currentDay - 1) { bg = 'var(--primary)'; color = '#fff'; border = 'none'; glow = '0 0 0 3px var(--primary-light)' }
          return (
            <div key={i} style={{ width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: bg, color, border, boxShadow: glow }}>
              {dayNum}
            </div>
          )
        })}
      </div>

      {/* Stats */}
      {!isLocked ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { val: `${week.daysCompleted}/7`, lbl: 'Days done', color: isDone ? 'var(--green)' : isCurrent ? 'var(--primary)' : 'var(--text)' },
              { val: week.hasAssignment ? (week.assignmentSubmitted ? '1/1' : '0/1') : 'N/A', lbl: 'Assignment', color: isDone ? 'var(--green)' : isCurrent ? 'var(--primary)' : 'var(--text)' },
              { val: `${Math.round((week.daysCompleted / 7) * 100)}%`, lbl: 'Complete', color: isDone ? 'var(--green)' : isCurrent ? 'var(--primary)' : 'var(--text)' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,.5)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 18, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
          {isCurrent && !isDone && (
            <div style={{ marginTop: 14 }}>
              <button className="du-btn du-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={e => { e.stopPropagation(); navigate(`/week/${week.weekNumber}`, { state: { cohortId } }) }}>
                <i className="ti ti-arrow-right" /> Continue Week {week.weekNumber}
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--locked)', fontWeight: 500, marginTop: 12 }}>
          <i className="ti ti-lock" style={{ fontSize: 16 }} />
          Complete all of Week {week.weekNumber - 1} to unlock this week
        </div>
      )}
    </div>
  )
}

export default function JourneyPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['journey'],
    queryFn: () => studentsApi.getJourney().then(r => r.data),
  })

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '4px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (error || !data || !('cohortId' in data)) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 8 }}>You're not enrolled in a cohort yet.</p>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Ask your admin or mentor to enrol you.</p>
      </div>
    </div>
  )

  const journey = data as any
  const weeks   = journey.weeks as WeekCard[]
  const totalDone = weeks.reduce((s: number, w: WeekCard) => s + w.daysCompleted, 0)
  const pct = Math.round((totalDone / 28) * 100)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px 0', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>My Journey</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
            28-day discipleship training · {journey.cohortName} · Day {(journey.currentWeek - 1) * 7 + journey.currentDay} / 28
          </div>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 120, height: 6, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--primary),var(--primary-mid))', borderRadius: 10 }} />
          </div>
          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13 }}>{pct}%</span>
        </div>
      </div>

      <div style={{ padding: '0 32px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        {weeks.map((week: WeekCard) => (
          <WeekCardLarge key={week.weekId} week={week} cohortId={journey.cohortId} currentWeek={journey.currentWeek} currentDay={journey.currentDay} />
        ))}
      </div>
    </>
  )
}
