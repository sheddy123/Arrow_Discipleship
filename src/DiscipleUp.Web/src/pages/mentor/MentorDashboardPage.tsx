import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { mentorsApi, type MentorStudentRow } from '@/api/mentors'
import { useMentorCohort } from '@/hooks/useMentorCohort'
import { PageSkeleton, EmptyState } from '@/components/Skeleton'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Combobox } from '@/components/ui/combobox'
import MentorDashboardMobile from '@/pages/mentor/MentorDashboardMobile'

function StatCard({ icon, label, value, color, bg }: { icon: string; label: string; value: number | string; color: string; bg: string }) {
  return (
    <div style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow)' }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className={`ti ${icon}`} style={{ fontSize: 20 }} />
      </div>
      <div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--du-muted)' }}>{label}</div>
      </div>
    </div>
  )
}

function StudentRow({ s, cohortId }: { s: MentorStudentRow; cohortId: number }) {
  const navigate = useNavigate()
  const pct = s.totalTasks ? Math.round((s.tasksCompleted / s.totalTasks) * 100) : 0
  return (
    <tr
      onClick={() => navigate(`/mentor/students/${s.studentId}?cohortId=${cohortId}`)}
      style={{ cursor: 'pointer', borderBottom: '1px solid var(--du-border)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary-pale)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,var(--primary-mid),var(--du-primary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'Sora,sans-serif', flexShrink: 0 }}>
            {s.firstName[0]}{s.lastName[0]}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.firstName} {s.lastName}</div>
            <div style={{ fontSize: 11, color: 'var(--du-muted)' }}>{s.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>W{s.currentWeek} · D{s.currentDay}</td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 90, height: 6, background: 'var(--du-border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: s.atRisk ? 'var(--coral)' : 'var(--green)', borderRadius: 10 }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--du-muted)' }}>{pct}%</span>
        </div>
      </td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>🔥 {s.currentStreak}</td>
      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{s.submissionCount}</td>
      <td style={{ padding: '12px 16px' }}>
        {s.atRisk
          ? <span className="pill pill-coral"><i className="ti ti-alert-triangle" style={{ fontSize: 10 }} /> At risk</span>
          : <span className="pill pill-green"><i className="ti ti-check" style={{ fontSize: 10 }} /> On track</span>}
      </td>
    </tr>
  )
}

export default function MentorDashboardPage() {
  const { cohorts, cohort, isLoading: cohortsLoading, selectCohort } = useMentorCohort()
  const isMobile = useIsMobile()

  const { data, isLoading } = useQuery({
    queryKey: ['mentor-dashboard', cohort?.id],
    queryFn: () => mentorsApi.getDashboard(cohort!.id).then(r => r.data),
    enabled: !!cohort,
  })

  if (isMobile) return <MentorDashboardMobile />
  if (cohortsLoading || (cohort && isLoading)) return <PageSkeleton variant="table" />

  if (!cohort) return (
    <EmptyState icon="ti-users-group" title="No cohort assigned"
      message="You aren't leading a cohort yet. Once an admin assigns you one, your students and their progress will appear here." />
  )

  return (
    <div className="du-pad" style={{ padding: '24px 32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>Mentor Dashboard</div>
          <div style={{ fontSize: 13, color: 'var(--du-muted)', marginTop: 3 }}>
            {cohort.name} · started {new Date(cohort.startDate).toLocaleDateString()} · {cohort.status}
          </div>
        </div>
        {cohorts.length > 1 && (
          <Combobox
            options={cohorts.map(c => ({ value: String(c.id), label: c.name }))}
            value={String(cohort.id)}
            onValueChange={(v) => v && selectCohort(Number(v))}
            placeholder="Search cohort…"
            emptyText="No cohorts found."
            className="w-60"
          />
        )}
      </div>

      <div className="du-grid-stats" style={{ gap: 14, marginBottom: 24 }}>
        <StatCard icon="ti-users"            label="Students"            value={data?.cohort.studentCount ?? 0}       color="var(--du-primary)" bg="var(--primary-light)" />
        <StatCard icon="ti-check"            label="On track"            value={data?.onTrackCount ?? 0}              color="var(--green)"   bg="var(--green-bg)" />
        <StatCard icon="ti-alert-triangle"   label="At risk"             value={data?.atRiskCount ?? 0}               color="var(--coral)"   bg="var(--coral-bg)" />
        <StatCard icon="ti-clipboard-check"  label="Pending reviews"     value={data?.cohort.pendingSubmissions ?? 0} color="var(--gold)"    bg="var(--gold-bg)" />
        <StatCard icon="ti-heart-handshake"  label="Pending prayers"     value={data?.cohort.pendingPrayerRequests ?? 0} color="var(--red)"  bg="var(--red-bg)" />
      </div>

      <div style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--du-border)', fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
          Student progress
        </div>
        <div className="du-table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)' }}>
              {['Student', 'Position', 'Tasks', 'Streak', 'Submissions', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--du-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.students.map(s => <StudentRow key={s.studentId} s={s} cohortId={cohort.id} />)}
            {!data?.students.length && (
              <tr><td colSpan={6} style={{ padding: '30px 16px', textAlign: 'center', fontSize: 13, color: 'var(--du-muted)' }}>No students enrolled yet.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
