import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mentorsApi, type PrayerPost } from '@/api/mentors'
import { useMentorCohort } from '@/hooks/useMentorCohort'

const STATUS_PILL: Record<PrayerPost['status'], { cls: string; icon: string }> = {
  Pending:  { cls: 'pill-gold',  icon: 'ti-clock' },
  Approved: { cls: 'pill-green', icon: 'ti-check' },
  Rejected: { cls: 'pill-red',   icon: 'ti-x' },
}

export default function MentorPrayerPage() {
  const { cohort } = useMentorCohort()
  const qc = useQueryClient()
  const [filter, setFilter] = useState<string | undefined>('Pending')

  const { data: posts, isLoading } = useQuery({
    queryKey: ['mentor-prayers', cohort?.id, filter],
    queryFn: () => mentorsApi.getPrayerRequests(cohort!.id, filter).then(r => r.data),
    enabled: !!cohort,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['mentor-prayers', cohort?.id] })
    qc.invalidateQueries({ queryKey: ['mentor-dashboard', cohort?.id] })
    qc.invalidateQueries({ queryKey: ['mentor-cohorts'] })
  }

  const approve = useMutation({ mutationFn: (id: number) => mentorsApi.approvePrayer(id), onSettled: invalidate })
  const reject  = useMutation({ mutationFn: (id: number) => mentorsApi.rejectPrayer(id),  onSettled: invalidate })

  return (
    <div style={{ padding: '24px 32px 40px', maxWidth: 760 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>Prayer Wall Moderation</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
            {cohort?.name ?? ''} · approved posts appear on the cohort wall
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          {[{ v: 'Pending', lbl: 'Pending' }, { v: 'Approved', lbl: 'Approved' }, { v: undefined, lbl: 'All' }].map(t => (
            <button key={t.lbl} onClick={() => setFilter(t.v)} style={{
              border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif',
              background: filter === t.v ? 'var(--primary)' : 'transparent',
              color: filter === t.v ? '#fff' : 'var(--muted)',
            }}>{t.lbl}</button>
          ))}
        </div>
      </div>

      {isLoading && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</p>}
      {!isLoading && !posts?.length && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <i className="ti ti-heart-handshake" style={{ fontSize: 36, color: 'var(--green)' }} />
          <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginTop: 10 }}>Nothing here.</p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>New prayer requests appear instantly when students post.</p>
        </div>
      )}

      {posts?.map(post => {
        const pill = STATUS_PILL[post.status]
        return (
          <div key={post.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', marginBottom: 12, boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                {post.authorName}
                <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 8, fontSize: 12 }}>
                  {new Date(post.createdAt).toLocaleString()}
                </span>
              </div>
              <span className={`pill ${pill.cls}`}><i className={`ti ${pill.icon}`} style={{ fontSize: 10 }} /> {post.status}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: post.status === 'Pending' ? 12 : 0 }}>
              {post.content}
            </div>
            {post.status === 'Pending' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="du-btn du-btn-primary du-btn-sm" onClick={() => approve.mutate(post.id)} disabled={approve.isPending}>
                  <i className="ti ti-check" /> Approve
                </button>
                <button className="du-btn du-btn-outline du-btn-sm" onClick={() => reject.mutate(post.id)} disabled={reject.isPending}
                  style={{ color: 'var(--red)', borderColor: 'var(--red-bg)' }}>
                  <i className="ti ti-x" /> Reject
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
