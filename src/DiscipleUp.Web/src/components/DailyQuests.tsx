import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi, type Quest } from '@/api/students'
import { celebrateXp } from '@/lib/celebrate'
import { fireConfetti } from '@/lib/gameFx'

const ICON: Record<string, string> = {
  KeepStreak: 'ti-flame',
  CompleteTasks: 'ti-checkbox',
  MemoriseVerse: 'ti-book',
}

/**
 * The student's rotating daily quests with live progress and a claim button.
 * Self-contained: renders nothing until the student is enrolled and has quests.
 */
export default function DailyQuests({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient()

  const { data: quests } = useQuery({
    queryKey: ['quests'],
    queryFn: () => studentsApi.getQuests().then(r => r.data),
  })

  const claim = useMutation({
    mutationFn: (id: number) => studentsApi.claimQuest(id),
    onSuccess: (res) => {
      fireConfetti({ count: 130, power: 14 })
      celebrateXp({
        xpGained: res.data.rewardXp,
        level: res.data.level,
        levelTitle: res.data.levelTitle,
        leveledUp: res.data.leveledUp,
      })
      qc.invalidateQueries({ queryKey: ['quests'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  if (!quests?.length) return null

  const claimable = quests.filter(q => q.completed && !q.claimed).length

  return (
    <div style={{
      background: 'var(--du-card)', border: '1px solid var(--du-border)',
      borderRadius: compact ? 14 : 'var(--du-radius)', boxShadow: 'var(--shadow)',
      padding: compact ? '16px 16px' : '20px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: '#fff' }}>
          <i className="ti ti-target-arrow" style={{ fontSize: 15 }} />
        </span>
        <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Daily quests</div>
        {claimable > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--gold)', borderRadius: 20, padding: '3px 10px' }}>
            {claimable} to claim
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {quests.map((q: Quest) => {
          const pct = Math.min(100, Math.round((q.progress / q.target) * 100))
          const canClaim = q.completed && !q.claimed
          return (
            <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: q.claimed ? 0.6 : 1 }}>
              <span style={{
                flexShrink: 0, width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: q.claimed ? 'var(--green-bg)' : canClaim ? 'var(--surface-gold-bg)' : 'var(--primary-pale)',
                color: q.claimed ? 'var(--green)' : canClaim ? 'var(--gold-text)' : 'var(--du-primary)',
              }}>
                <i className={`ti ${q.claimed ? 'ti-check' : ICON[q.type] ?? 'ti-star'}`} style={{ fontSize: 16 }} />
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--du-muted)', flexShrink: 0 }}>{Math.min(q.progress, q.target)}/{q.target}</span>
                </div>
                <div style={{ height: 6, background: 'var(--du-border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 10, transition: 'width .5s', background: q.claimed ? 'var(--green)' : canClaim ? 'linear-gradient(90deg,#FCD34D,#F97316)' : 'var(--du-primary)' }} />
                </div>
              </div>

              <div style={{ flexShrink: 0, width: 92, textAlign: 'right' }}>
                {q.claimed ? (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)' }}>Claimed ✓</span>
                ) : canClaim ? (
                  <button className="du-btn du-btn-sm" onClick={() => claim.mutate(q.id)} disabled={claim.isPending}
                    style={{ background: 'linear-gradient(135deg,#FCD34D,#F97316)', color: '#3b1d00', border: 'none', fontWeight: 700 }}>
                    +{q.rewardXp} XP
                  </button>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--du-muted)' }}>+{q.rewardXp} XP</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
