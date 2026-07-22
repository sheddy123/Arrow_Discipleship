import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { studentsApi, type WeekCard } from '@/api/students'
import { PageSkeleton, EmptyState } from '@/components/Skeleton'

type NodeState = 'done' | 'current' | 'upcoming' | 'locked'

interface PathNode {
  key: string
  weekNumber: number
  kind: 'day' | 'assignment'
  label: string
  state: NodeState
}

// Gentle serpentine: horizontal offset (px) cycles as we walk down the trail.
const OFFSETS = [0, 58, 92, 58, 0, -58, -92, -58]

function buildNodes(weeks: WeekCard[], currentWeek: number, currentDay: number): PathNode[] {
  const nodes: PathNode[] = []
  for (const w of weeks) {
    const locked = w.status === 'Locked'
    const isCurrentWeek = w.weekNumber === currentWeek
    for (let i = 0; i < 7; i++) {
      let state: NodeState
      if (locked) state = 'locked'
      else if (i < w.daysCompleted) state = 'done'
      else if (isCurrentWeek && i === currentDay - 1) state = 'current'
      else state = 'upcoming'
      nodes.push({ key: `w${w.weekNumber}d${i + 1}`, weekNumber: w.weekNumber, kind: 'day', label: String((w.weekNumber - 1) * 7 + i + 1), state })
    }
    if (w.hasAssignment) {
      const state: NodeState = locked ? 'locked'
        : w.assignmentSubmitted ? 'done'
        : w.daysCompleted >= 7 ? 'current' : 'upcoming'
      nodes.push({ key: `w${w.weekNumber}a`, weekNumber: w.weekNumber, kind: 'assignment', label: 'A', state })
    }
  }
  return nodes
}

function Node({ node, onClick }: { node: PathNode; onClick: () => void }) {
  const clickable = node.state !== 'locked'
  const isAssign = node.kind === 'assignment'

  const palette: Record<NodeState, { bg: string; color: string; ring: string; border: string }> = {
    done:     { bg: isAssign ? 'linear-gradient(135deg,#FCD34D,#F97316)' : 'var(--green)', color: '#fff', ring: 'transparent', border: 'transparent' },
    current:  { bg: isAssign ? 'linear-gradient(135deg,#FCD34D,#F97316)' : 'linear-gradient(135deg,var(--primary-mid),var(--du-primary))', color: '#fff', ring: 'var(--primary-light)', border: 'transparent' },
    upcoming: { bg: 'var(--du-card)', color: 'var(--du-muted)', ring: 'transparent', border: '2px solid var(--du-border)' },
    locked:   { bg: 'var(--locked-bg)', color: 'var(--locked)', ring: 'transparent', border: 'none' },
  }
  const p = palette[node.state]
  const size = isAssign ? 64 : 58

  const inner = node.state === 'done'
    ? <i className="ti ti-check" style={{ fontSize: 24 }} />
    : node.state === 'locked'
    ? <i className="ti ti-lock" style={{ fontSize: 20 }} />
    : isAssign
    ? <i className="ti ti-star" style={{ fontSize: 24 }} />
    : <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 18 }}>{node.label}</span>

  return (
    <button
      onClick={() => clickable && onClick()}
      disabled={!clickable}
      aria-label={`${isAssign ? 'Assignment' : `Day ${node.label}`} — ${node.state}`}
      style={{
        position: 'relative', width: size, height: size, borderRadius: '50%',
        background: p.bg, color: p.color, border: p.border,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: clickable ? 'pointer' : 'default',
        boxShadow: node.state === 'locked' ? 'none' : '0 6px 16px rgba(2,44,54,.18)',
        transition: 'transform .15s',
        transform: 'translateZ(0)',
      }}
      onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
    >
      {node.state === 'current' && (
        <span style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `3px solid ${p.ring}`, animation: 'du-node-pulse 1.8s ease-in-out infinite' }} />
      )}
      {inner}
      {node.state === 'current' && (
        <span style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', background: 'var(--du-primary)', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '.06em', padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap', boxShadow: '0 3px 10px rgba(2,44,54,.25)' }}>
          START
          <span style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 8, height: 8, background: 'var(--du-primary)' }} />
        </span>
      )}
    </button>
  )
}

export default function JourneyPage() {
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['journey'],
    queryFn: () => studentsApi.getJourney().then(r => r.data),
  })

  // Level header — reuses the cached dashboard query where available.
  const { data: dash } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => studentsApi.getDashboard().then(r => r.data),
  })

  if (isLoading) return <PageSkeleton variant="grid" />

  if (error || !data || !('cohortId' in data)) return (
    <EmptyState icon="ti-route" title="Your journey hasn't started"
      message="You're not enrolled in a cohort yet. Your admin or mentor will enrol you, and your discipleship journey will appear here." />
  )

  const journey = data as any
  const weeks = journey.weeks as WeekCard[]
  const totalDays = journey.totalDays || weeks.length * 7 || 1
  const totalDone = weeks.reduce((s: number, w: WeekCard) => s + w.daysCompleted, 0)
  const pct = Math.round((totalDone / totalDays) * 100)
  const level = dash?.level

  const nodes = buildNodes(weeks, journey.currentWeek, journey.currentDay)
  // Where each week's first node sits, so we can drop a chapter banner above it.
  const chapterStartKeys = new Set(weeks.map(w => `w${w.weekNumber}d1`))
  const weekByNumber = new Map(weeks.map(w => [w.weekNumber, w]))

  return (
    <>
      <style>{`@keyframes du-node-pulse{0%,100%{opacity:.9;transform:scale(1)}50%{opacity:.35;transform:scale(1.12)}}`}</style>

      {/* Header */}
      <div className="du-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px 0', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>My Journey</div>
          <div style={{ fontSize: 13, color: 'var(--du-muted)', marginTop: 3 }}>
            {journey.totalWeeks}-week quest · {journey.cohortName} · Day {(journey.currentWeek - 1) * 7 + journey.currentDay} / {totalDays}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {level && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'linear-gradient(135deg,#0C2430,#0E7490)', color: '#fff', borderRadius: 10, padding: '8px 14px' }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <span style={{ fontWeight: 800, fontSize: 13, fontFamily: 'Sora,sans-serif' }}>Lv {level.level}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>{level.title}</span>
            </div>
          )}
          <div style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 120, height: 6, background: 'var(--du-border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--du-primary),var(--primary-mid))', borderRadius: 10 }} />
            </div>
            <span style={{ fontWeight: 700, color: 'var(--du-primary)', fontSize: 13 }}>{pct}%</span>
          </div>
        </div>
      </div>

      {/* The trail */}
      <div className="du-pad" style={{ padding: '10px 16px 60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
          {nodes.map((node, i) => {
            const offset = OFFSETS[i % OFFSETS.length]
            const w = weekByNumber.get(node.weekNumber)
            const showChapter = chapterStartKeys.has(node.key)
            return (
              <div key={node.key}>
                {showChapter && w && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: i === 0 ? '4px 0 8px' : '26px 0 8px' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--du-border)' }} />
                    <div style={{
                      fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
                      color: w.status === 'Locked' ? 'var(--locked)' : w.status === 'Completed' ? 'var(--green)' : 'var(--du-primary)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {w.status === 'Locked' && <i className="ti ti-lock" style={{ fontSize: 12 }} />}
                      Week {w.weekNumber} · {w.title}
                    </div>
                    <div style={{ flex: 1, height: 1, background: 'var(--du-border)' }} />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '9px 0' }}>
                  <div style={{ transform: `translateX(${offset}px)`, transition: 'transform .2s' }}>
                    <Node node={node} onClick={() => navigate(`/week/${node.weekNumber}`, { state: { cohortId: journey.cohortId } })} />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Finish flag */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 18 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: pct >= 100 ? 'linear-gradient(135deg,#FCD34D,#F97316)' : 'var(--locked-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: pct >= 100 ? '#fff' : 'var(--locked)', boxShadow: pct >= 100 ? '0 6px 18px rgba(249,115,22,.4)' : 'none' }}>
              <i className="ti ti-flag-3" style={{ fontSize: 26 }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: pct >= 100 ? 'var(--gold-text)' : 'var(--du-muted)', marginTop: 8 }}>
              {pct >= 100 ? 'Journey complete! 🎉' : 'Finish line'}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
