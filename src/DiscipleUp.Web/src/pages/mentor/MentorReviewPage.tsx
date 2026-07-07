import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mentorsApi, type ReviewSubmission } from '@/api/mentors'
import { useMentorCohort } from '@/hooks/useMentorCohort'

function SubmissionCard({ sub, cohortId }: { sub: ReviewSubmission; cohortId: number }) {
  const qc = useQueryClient()
  const [comment, setComment] = useState(sub.feedback ?? '')
  const [open, setOpen] = useState(!sub.feedback)

  const feedback = useMutation({
    mutationFn: () => mentorsApi.leaveFeedback(sub.id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mentor-submissions', cohortId] })
      qc.invalidateQueries({ queryKey: ['mentor-dashboard', cohortId] })
      qc.invalidateQueries({ queryKey: ['mentor-cohorts'] })
    },
  })

  const pending = !sub.feedback

  return (
    <div style={{ background: 'var(--card)', border: `1.5px solid ${pending ? '#FCD34D' : 'var(--border)'}`, borderRadius: 14, marginBottom: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,var(--primary-mid),var(--primary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: 'Sora,sans-serif' }}>
            {sub.studentName.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{sub.studentName}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Week {sub.weekNumber} · {sub.assignmentTitle} · {new Date(sub.submittedAt).toLocaleString()}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {pending
            ? <span className="pill pill-gold"><i className="ti ti-clock" style={{ fontSize: 10 }} /> Awaiting review</span>
            : <span className="pill pill-green"><i className="ti ti-check" style={{ fontSize: 10 }} /> Reviewed</span>}
          <i className={`ti ti-chevron-${open ? 'up' : 'down'}`} style={{ color: 'var(--muted)' }} />
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-line', marginBottom: 14 }}>
            {sub.textContent || <em style={{ color: 'var(--muted)' }}>No text content</em>}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 8 }}>
            {sub.feedback ? 'Your feedback' : 'Leave feedback'}
          </div>
          <textarea
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Encourage, correct, or affirm…"
            style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontFamily: 'Inter,sans-serif', fontSize: 13, color: 'var(--text)', resize: 'none', outline: 'none', lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              className="du-btn du-btn-primary du-btn-sm"
              onClick={() => feedback.mutate()}
              disabled={feedback.isPending || !comment.trim()}
              style={{ opacity: feedback.isPending || !comment.trim() ? .6 : 1 }}
            >
              <i className="ti ti-send" /> {feedback.isPending ? 'Saving…' : sub.feedback ? 'Update feedback' : 'Send feedback'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MentorReviewPage() {
  const { cohort } = useMentorCohort()
  const [pendingOnly, setPendingOnly] = useState(true)

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['mentor-submissions', cohort?.id, pendingOnly],
    queryFn: () => mentorsApi.getSubmissions(cohort!.id, pendingOnly).then(r => r.data),
    enabled: !!cohort,
  })

  return (
    <div style={{ padding: '24px 32px 40px', maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>Review Queue</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{cohort?.name ?? ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
          {[{ v: true, lbl: 'Pending' }, { v: false, lbl: 'All' }].map(t => (
            <button key={String(t.v)} onClick={() => setPendingOnly(t.v)} style={{
              border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif',
              background: pendingOnly === t.v ? 'var(--primary)' : 'transparent',
              color: pendingOnly === t.v ? '#fff' : 'var(--muted)',
            }}>{t.lbl}</button>
          ))}
        </div>
      </div>

      {isLoading && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading…</p>}
      {!isLoading && !submissions?.length && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <i className="ti ti-clipboard-check" style={{ fontSize: 36, color: 'var(--green)' }} />
          <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginTop: 10 }}>
            {pendingOnly ? 'All caught up!' : 'No submissions yet.'}
          </p>
          {pendingOnly && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>No submissions awaiting review.</p>}
        </div>
      )}
      {cohort && submissions?.map(sub => <SubmissionCard key={sub.id} sub={sub} cohortId={cohort.id} />)}
    </div>
  )
}
