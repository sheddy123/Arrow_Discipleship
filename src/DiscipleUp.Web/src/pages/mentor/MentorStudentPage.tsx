import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mentorsApi } from '@/api/mentors'
import { useMentorCohort } from '@/hooks/useMentorCohort'

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

  if (isLoading || !profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '4px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding: '24px 32px 40px', maxWidth: 900 }}>
      <button onClick={() => navigate(-1)} className="du-btn du-btn-outline du-btn-sm" style={{ marginBottom: 18 }}>
        <i className="ti ti-arrow-left" /> Back
      </button>

      {/* Header card */}
      <div style={{ background: 'linear-gradient(135deg,var(--primary),var(--primary-mid))', borderRadius: 18, padding: '26px 28px', color: '#fff', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22 }}>
          {profile.firstName[0]}{profile.lastName[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22 }}>{profile.firstName} {profile.lastName}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', marginTop: 2 }}>
            {profile.email} · enrolled {new Date(profile.enrolledAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { val: `W${profile.currentWeek}·D${profile.currentDay}`, lbl: 'Position' },
            { val: `🔥 ${profile.currentStreak}`, lbl: 'Streak' },
            { val: profile.longestStreak, lbl: 'Best streak' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.12)', borderRadius: 12, padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 17 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Week progress */}
      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 12 }}>Week progress</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 26 }}>
        {profile.weeks.map(w => {
          const complete = w.totalTasks > 0 && w.tasksCompleted === w.totalTasks && (!w.hasAssignment || w.assignmentSubmitted)
          const reachable = w.weekNumber <= profile.currentWeek || w.manuallyUnlocked
          const pct = w.totalTasks ? Math.round((w.tasksCompleted / w.totalTasks) * 100) : 0
          return (
            <div key={w.weekNumber} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', boxShadow: 'var(--shadow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Week {w.weekNumber} — {w.title}</div>
                {complete ? <span className="pill pill-green">Done</span>
                  : reachable ? <span className="pill pill-primary">Open</span>
                  : <span className="pill pill-muted"><i className="ti ti-lock" style={{ fontSize: 10 }} /> Locked</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                {w.daysCompleted}/7 days · {w.tasksCompleted}/{w.totalTasks} tasks
                {w.hasAssignment && <> · assignment {w.assignmentSubmitted ? '✓' : 'pending'}</>}
                {w.manuallyUnlocked && <> · <span style={{ color: 'var(--gold-text)' }}>manually unlocked</span></>}
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: w.weekNumber > 1 && !reachable ? 10 : 0 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: complete ? 'var(--green)' : 'var(--primary)', borderRadius: 10 }} />
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
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>No submissions yet.</p>
      )}
      {profile.submissions.map(sub => (
        <div key={sub.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Week {sub.weekNumber} · {sub.assignmentTitle}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(sub.submittedAt).toLocaleString()}</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{sub.textContent}</div>
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
