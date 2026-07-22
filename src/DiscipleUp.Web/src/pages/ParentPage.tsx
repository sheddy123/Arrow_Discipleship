import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { parentsApi } from '@/api/parents'
import { PageSkeleton, EmptyState } from '@/components/Skeleton'
import { Combobox } from '@/components/ui/combobox'

const BADGE_ICONS: Record<string, string> = {
  'Getting Started': '🌱',
  '7-Day Warrior': '⚔️',
  'Journey Finisher': '🏁',
  'First Step': '👣',
  'Week Champion': '🏆',
  'Perfect Week': '💎',
}

export default function ParentPage() {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ['parent-children'],
    queryFn: () => parentsApi.getChildren().then(r => r.data),
  })

  const childId = selectedChildId ?? children?.[0]?.id

  const { data: child, isLoading } = useQuery({
    queryKey: ['child-dashboard', childId],
    queryFn: () => parentsApi.getChildDashboard(childId!).then(r => r.data),
    enabled: !!childId,
  })

  if (childrenLoading) return <PageSkeleton variant="list" />


  if (!children?.length) return (
    <EmptyState icon="ti-mood-kid" title="No linked children yet"
      message="When your child registers with your email address, they'll appear here and you'll see their progress." />
  )

  return (
    <div className="du-pad" style={{ padding: '24px 32px 40px', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>My Children</div>
          <div style={{ fontSize: 13, color: 'var(--du-muted)', marginTop: 3 }}>Read-only view of your child's journey</div>
        </div>
        {children.length > 1 && (
          <Combobox
            options={children.map(c => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))}
            value={childId ?? ''}
            onValueChange={(v) => v && setSelectedChildId(v)}
            placeholder="Search child…"
            emptyText="No children found."
            className="w-56"
          />
        )}
      </div>

      {isLoading || !child ? (
        <p style={{ color: 'var(--du-muted)', fontSize: 13 }}>Loading…</p>
      ) : (
        <>
          {/* Summary banner */}
          <div style={{ background: 'linear-gradient(135deg,var(--du-primary),var(--primary-mid))', borderRadius: 18, padding: '24px 28px', color: '#fff', marginBottom: 20 }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, marginBottom: 4 }}>
              {child.firstName} {child.lastName}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', marginBottom: 16 }}>
              {child.cohortName ?? 'Not enrolled in a cohort yet'}
            </div>
            <div className="du-grid-4" style={{ gap: 12 }}>
              {[
                { val: `W${child.currentWeek} · D${child.currentDay}`, lbl: 'Position' },
                { val: `🔥 ${child.currentStreak}`, lbl: 'Current streak' },
                { val: child.longestStreak, lbl: 'Best streak' },
                { val: `${child.tasksCompleted}/${child.totalTasks}`, lbl: 'Tasks done' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 18 }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 3 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Week progress */}
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 12 }}>Week progress</div>
          <div className="du-grid-2" style={{ gap: 12, marginBottom: 24 }}>
            {child.weeks.map(week => (
              <div key={week.weekNumber} style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderRadius: 14, padding: '14px 18px', boxShadow: 'var(--shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Week {week.weekNumber} — {week.title}</div>
                  {week.daysCompleted === 7 && <span className="pill pill-green">Done</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--du-muted)', marginBottom: 8 }}>
                  {week.daysCompleted}/7 days{week.hasAssignment && <> · assignment {week.assignmentSubmitted ? '✓' : 'pending'}</>}
                </div>
                <div style={{ height: 6, background: 'var(--du-border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(week.daysCompleted / 7) * 100}%`, background: week.daysCompleted === 7 ? 'var(--green)' : 'var(--du-primary)', borderRadius: 10 }} />
                </div>
              </div>
            ))}
            {!child.weeks.length && <p style={{ fontSize: 13, color: 'var(--du-muted)' }}>No published content yet.</p>}
          </div>

          {/* Badges */}
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 12 }}>Badges earned</div>
          {!child.badges.length && <p style={{ fontSize: 13, color: 'var(--du-muted)' }}>No badges yet — they're on their way!</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {child.badges.map(badge => (
              <div key={badge.name} style={{ background: 'linear-gradient(135deg,var(--gold-bg),#FEF3C7)', border: '1.5px solid #FCD34D', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{BADGE_ICONS[badge.name] ?? '🎖️'}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-text)' }}>{badge.name}</div>
                  {badge.earnedAt && <div style={{ fontSize: 10, color: 'var(--gold-text)', opacity: .7 }}>{new Date(badge.earnedAt).toLocaleDateString()}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
