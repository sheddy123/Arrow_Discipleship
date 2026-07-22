import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { studentsApi } from '@/api/students'
import { PageSkeleton, EmptyState } from '@/components/Skeleton'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => studentsApi.getLeaderboard().then(r => r.data),
  })

  const optIn = useMutation({
    mutationFn: (value: boolean) => studentsApi.setLeaderboardOptIn(value),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      qc.invalidateQueries({ queryKey: ['student-profile'] })
    },
  })

  if (isLoading) return <PageSkeleton variant="list" />

  if (!data?.enrolled) return (
    <EmptyState icon="ti-trophy" title="No leaderboard yet"
      message="Once you're enrolled in a cohort, you'll be able to compare streaks with your group here." />
  )

  const entries = data.entries ?? []

  return (
    <div className="du-pad" style={{ padding: '24px 32px 40px', maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>Leaderboard</div>
          <div style={{ fontSize: 13, color: 'var(--du-muted)', marginTop: 3 }}>Ranked by current streak · opt-in only</div>
        </div>
        <button
          className={`du-btn du-btn-sm ${data.optedIn ? 'du-btn-outline' : 'du-btn-primary'}`}
          onClick={() => optIn.mutate(!data.optedIn)}
          disabled={optIn.isPending}
        >
          {data.optedIn ? <><i className="ti ti-eye-off" /> Leave leaderboard</> : <><i className="ti ti-trophy" /> Join leaderboard</>}
        </button>
      </div>

      {!data.optedIn && (
        <div style={{ background: 'var(--gold-bg)', border: '1.5px solid #FCD34D', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--gold-text)', marginBottom: 18 }}>
          You're not on the leaderboard. Join to compete with your cohort — only your name and streak are shown.
        </div>
      )}

      {!entries.length && (
        <div style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <i className="ti ti-trophy" style={{ fontSize: 36, color: 'var(--gold)' }} />
          <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginTop: 10 }}>No one on the board yet.</p>
          <p style={{ fontSize: 13, color: 'var(--du-muted)', marginTop: 4 }}>Be the first to opt in!</p>
        </div>
      )}

      {entries.map(entry => (
        <div key={entry.rank} style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', marginBottom: 8,
          background: entry.isMe ? 'var(--primary-pale)' : 'var(--du-card)',
          border: `1.5px solid ${entry.isMe ? 'var(--primary-mid)' : 'var(--du-border)'}`,
          borderRadius: 14, boxShadow: 'var(--shadow)',
        }}>
          <div style={{ width: 36, textAlign: 'center', fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: entry.rank <= 3 ? 22 : 15, color: 'var(--du-muted)' }}>
            {entry.rank <= 3 ? MEDALS[entry.rank - 1] : entry.rank}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {entry.name} {entry.isMe && <span className="pill pill-primary" style={{ marginLeft: 6 }}>You</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--du-muted)', marginTop: 1 }}>{entry.tasksCompleted} tasks completed</div>
          </div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--gold)' }}>
            🔥 {entry.currentStreak}
          </div>
        </div>
      ))}
    </div>
  )
}
