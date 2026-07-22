import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mentorsApi } from '@/api/mentors'
import { useMentorCohort } from '@/hooks/useMentorCohort'
import { PageSkeleton } from '@/components/Skeleton'

export default function MentorStudentPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { cohort } = useMentorCohort()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['mentor-student', cohort?.id, studentId],
    queryFn: () => mentorsApi.getStudentProfile(cohort!.id, studentId!).then(r => r.data),
    enabled: !!cohort && !!studentId,
  })

  const unlock = useMutation({
    mutationFn: (weekNumber: number) => mentorsApi.unlockWeek(cohort!.id, studentId!, weekNumber),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-student', cohort?.id, studentId] }),
  })

  if (isLoading || !profile) return <PageSkeleton variant="panel" />


  return (
    <div className="du-pad" style={{ padding: '24px 32px 40px', maxWidth: 900 }}>
      <button onClick={() => navigate(-1)} className="du-btn du-btn-outline du-btn-sm" style={{ marginBottom: 18 }}>
        <i className="ti ti-arrow-left" /> Back
      </button>

      {/* Header card */}
      <div style={{ background: 'linear-gradient(135deg,var(--du-primary),var(--primary-mid))', borderRadius: 18, padding: '22px 22px', color: '#fff', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
          {profile.firstName[0]}{profile.lastName[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, wordBreak: 'break-word' }}>{profile.firstName} {profile.lastName}</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)', marginTop: 2, wordBreak: 'break-word' }}>
            {profile.email} · enrolled {new Date(profile.enrolledAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { val: `W${profile.currentWeek}·D${profile.currentDay}`, lbl: 'Position' },
            { val: `🔥 ${profile.currentStreak}`, lbl: 'Streak' },
            { val: profile.longestStreak, lbl: 'Best streak' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '9px 14px', textAlign: 'center', flex: '1 0 auto', minWidth: 74 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 16 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Week progress */}
      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 12 }}>Week progress</div>
      <div className="du-grid-2" style={{ gap: 14, marginBottom: 26 }}>
        {profile.weeks.map(w => {
          const complete = w.totalTasks > 0 && w.tasksCompleted === w.totalTasks && (!w.hasAssignment || w.assignmentSubmitted)
          const reachable = w.weekNumber <= profile.currentWeek || w.manuallyUnlocked
          const pct = w.totalTasks ? Math.round((w.tasksCompleted / w.totalTasks) * 100) : 0
          return (
            <div key={w.weekNumber} style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Week {w.weekNumber} — {w.title}</div>
                {complete ? <span className="pill pill-green">Done</span>
                  : reachable ? <span className="pill pill-primary">Open</span>
                  : <span className="pill pill-muted"><i className="ti ti-lock" style={{ fontSize: 10 }} /> Locked</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--du-muted)', marginBottom: 8 }}>
                {w.daysCompleted}/7 days · {w.tasksCompleted}/{w.totalTasks} tasks
                {w.hasAssignment && <> · assignment {w.assignmentSubmitted ? '✓' : 'pending'}</>}
                {w.manuallyUnlocked && <> · <span style={{ color: 'var(--gold-text)' }}>manually unlocked</span></>}
              </div>
              <div style={{ height: 6, background: 'var(--du-border)', borderRadius: 10, overflow: 'hidden', marginBottom: w.weekNumber > 1 && !reachable ? 10 : 0 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: complete ? 'var(--green)' : 'var(--du-primary)', borderRadius: 10 }} />
              </div>
              {w.weekNumber > 1 && !reachable && (
                <button
                  className="du-btn du-btn-secondary du-btn-sm"
                  onClick={() => unlock.mutate(w.weekNumber)}
                  disabled={unlock.isPending}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <i className="ti ti-lock-open" /> {unlock.isPending ? 'Unlocking…' : `Unlock Week ${w.weekNumber}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Submission log */}
      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 12 }}>Submission log</div>
      {!profile.submissions.length && (
        <p style={{ fontSize: 13, color: 'var(--du-muted)' }}>No submissions yet.</p>
      )}
      {profile.submissions.map(sub => (
        <div key={sub.id} style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderRadius: 12, padding: '14px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', minWidth: 0, wordBreak: 'break-word' }}>Week {sub.weekNumber} · {sub.assignmentTitle}</div>
            <div style={{ fontSize: 11, color: 'var(--du-muted)', flexShrink: 0 }}>{new Date(sub.submittedAt).toLocaleDateString()}</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--du-muted)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{sub.textContent}</div>
          {sub.feedback && (
            <div style={{ marginTop: 8, background: 'var(--green-bg)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--green-text)' }}>
              Feedback: {sub.feedback}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
