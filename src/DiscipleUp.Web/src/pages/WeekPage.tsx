import { useState } from 'react'
import { useParams, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi, type DayContent, type WeekContent } from '@/api/students'

function DayNav({ days, activeIdx, currentDay, onSelect }: {
  days: DayContent[]; activeIdx: number; currentDay: number; onSelect: (i: number) => void
}) {
  return (
    <div style={{ borderRight: '1px solid var(--border)', padding: '20px 16px', overflowY: 'auto', background: 'var(--card)' }}>
      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 14, padding: '0 4px' }}>Days</div>
      {days.map((day, i) => {
        const isActive = i === activeIdx
        const isToday  = day.dayNumber === currentDay
        const isDone   = day.allTasksCompleted
        return (
          <button key={day.id} onClick={() => onSelect(i)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
            cursor: 'pointer', marginBottom: 4, border: 'none', width: '100%', textAlign: 'left',
            fontFamily: 'Inter,sans-serif', transition: 'all .15s',
            background: isActive ? 'var(--primary)' : isDone ? 'var(--green-bg)' : 'transparent',
            color: isActive ? '#fff' : 'var(--text)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
              background: isActive ? 'rgba(255,255,255,.2)' : isDone ? 'var(--green)' : 'var(--border)',
              color: isActive || isDone ? '#fff' : 'var(--muted)',
            }}>
              {isDone ? <i className="ti ti-check" style={{ fontSize: 12 }} /> : day.dayNumber}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#fff' : 'var(--text)' }}>Day {day.dayNumber}</div>
              <div style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,.6)' : 'var(--muted)', marginTop: 1 }}>
                {isDone ? 'Completed ✓' : isToday ? `${day.tasks.filter(t => !t.isCompleted).length} tasks left` : 'Upcoming'}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function DayCenter({ day, cohortId, week }: { day: DayContent; cohortId: number; week: WeekContent }) {
  const qc = useQueryClient()

  const completeTask = useMutation({
    mutationFn: (taskId: number) => studentsApi.completeTask(cohortId, taskId),
    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: ['week', cohortId, week.weekNumber] })
      const prev = qc.getQueryData(['week', cohortId, week.weekNumber])
      qc.setQueryData(['week', cohortId, week.weekNumber], (old: WeekContent) => ({
        ...old,
        days: old.days.map(d => d.id === day.id ? {
          ...d,
          tasks: d.tasks.map(t => t.id === taskId ? { ...t, isCompleted: true } : t),
          allTasksCompleted: d.tasks.every(t => t.id === taskId || t.isCompleted),
        } : d),
      }))
      return { prev }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(['week', cohortId, week.weekNumber], ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['week', cohortId, week.weekNumber] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['journey'] })
    },
  })

  return (
    <div className="du-scroll" style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--primary)', color: '#fff', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
        <i className="ti ti-calendar" style={{ fontSize: 12 }} />
        Day {day.dayNumber} · {day.title}
        {day.allTasksCompleted && <i className="ti ti-check-circle" style={{ fontSize: 12, marginLeft: 4 }} />}
      </div>

      {day.scriptureReference && (
        <div style={{ background: 'linear-gradient(135deg,#2D1B69,#5B21B6)', borderRadius: 16, padding: '22px 24px', color: '#fff', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.5)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-book" style={{ fontSize: 11 }} /> Today's verse
          </div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontStyle: 'italic', fontSize: 16, fontWeight: 600, lineHeight: 1.6, marginBottom: 10 }}>
            "{day.scriptureText}"
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>— {day.scriptureReference}</div>
        </div>
      )}

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 16, boxShadow: 'var(--shadow)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--coral)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-pencil" style={{ fontSize: 11 }} /> Today's devotion
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{day.devotionText}</div>
      </div>

      {day.tasks.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-checkbox" style={{ fontSize: 11 }} /> Tasks
            {day.allTasksCompleted && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green)' }}>All done ✓</span>}
          </div>
          {day.tasks.map(task => (
            <div key={task.id} onClick={() => !task.isCompleted && completeTask.mutate(task.id)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border)', cursor: task.isCompleted ? 'default' : 'pointer' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
                border: `2px solid ${task.isCompleted ? 'var(--green)' : 'var(--border-strong)'}`,
                background: task.isCompleted ? 'var(--green)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
              }}>
                {task.isCompleted && <i className="ti ti-check" style={{ color: '#fff', fontSize: 13 }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: task.isCompleted ? 'var(--muted)' : 'var(--text)', textDecoration: task.isCompleted ? 'line-through' : 'none', lineHeight: 1.4 }}>{task.title}</div>
                {task.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{task.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WeekRight({ week, cohortId }: { week: WeekContent; cohortId: number }) {
  const qc = useQueryClient()
  const [text, setText] = useState(week.mySubmission?.textContent ?? '')
  const [saved, setSaved] = useState(false)

  const toggleScripture = useMutation({
    mutationFn: () => week.scriptureMemorized
      ? studentsApi.unmarkScriptureMemorized(cohortId, week.weekNumber)
      : studentsApi.markScriptureMemorized(cohortId, week.weekNumber),
    onSettled: () => qc.invalidateQueries({ queryKey: ['week', cohortId, week.weekNumber] }),
  })

  const submit = useMutation({
    mutationFn: () => studentsApi.submitAssignment(cohortId, week.assignment!.id, text),
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['week', cohortId, week.weekNumber] })
      qc.invalidateQueries({ queryKey: ['journey'] })
    },
  })

  const allTasks = week.days.flatMap(d => d.tasks)
  const doneTasks = allTasks.filter(t => t.isCompleted)
  const doneDays  = week.days.filter(d => d.allTasksCompleted)
  const wCount    = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className="du-scroll" style={{ borderLeft: '1px solid var(--border)', padding: 20, overflowY: 'auto', background: 'var(--card)' }}>

      {/* Scripture memory */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 10 }}>Scripture memory</div>
      <div style={{ background: week.scriptureMemorized ? 'var(--green-bg)' : 'var(--primary-pale)', border: `1.5px solid ${week.scriptureMemorized ? '#A7F3D0' : 'var(--primary-light)'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: week.scriptureMemorized ? 'var(--green-text)' : 'var(--primary)', marginBottom: 8 }}>
          {week.scriptureMemorized ? '✓ Verse memorized this week!' : 'Mark verse as memorized'}
        </div>
        <button onClick={() => toggleScripture.mutate()} disabled={toggleScripture.isPending}
          className={`du-btn du-btn-sm ${week.scriptureMemorized ? 'du-btn-outline' : 'du-btn-secondary'}`}
          style={{ width: '100%', justifyContent: 'center' }}>
          {week.scriptureMemorized ? <><i className="ti ti-x" /> Unmark</> : <><i className="ti ti-check" /> I've memorized it</>}
        </button>
      </div>

      {/* Progress */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 10 }}>Week {week.weekNumber} progress</div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        {[
          { lbl: 'Days done', pct: doneDays.length / 7, display: `${doneDays.length}/7`, color: 'var(--primary)' },
          { lbl: 'Tasks done', pct: allTasks.length ? doneTasks.length / allTasks.length : 0, display: `${doneTasks.length}/${allTasks.length}`, color: 'var(--coral)' },
          { lbl: 'Assignment', pct: week.mySubmission ? 1 : 0, display: week.mySubmission ? 'Done' : 'Pending', color: 'var(--gold)' },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 2 ? 8 : 0 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', width: 90, flexShrink: 0 }}>{row.lbl}</div>
            <div style={{ flex: 1, height: 7, background: 'var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 10, background: row.color, width: `${row.pct * 100}%`, transition: 'width .5s' }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: row.color, width: 55, textAlign: 'right' }}>{row.display}</div>
          </div>
        ))}
      </div>

      {/* Assignment */}
      {week.assignment && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 10 }}>Weekly assignment</div>
          <div style={{ background: 'linear-gradient(135deg,var(--gold-bg),#FEF3C7)', border: '1.5px solid #FCD34D', borderRadius: 14, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--gold-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-star" style={{ fontSize: 11 }} /> Assignment
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-text)', marginBottom: 6 }}>{week.assignment.title}</div>
            <div style={{ fontSize: 12, color: 'var(--gold-text)', opacity: .8, lineHeight: 1.5, marginBottom: 12 }}>{week.assignment.description}</div>
            {week.mySubmission?.mentorFeedback && (
              <div style={{ background: 'rgba(16,185,129,.1)', border: '1px solid #A7F3D0', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: 'var(--green-text)' }}>
                Feedback: {week.mySubmission.mentorFeedback}
              </div>
            )}
            <textarea rows={5} value={text} onChange={e => { setText(e.target.value); setSaved(false) }}
              style={{ width: '100%', border: '1.5px solid #FCD34D', borderRadius: 10, padding: '12px 14px', fontFamily: 'Inter,sans-serif', fontSize: 13, color: 'var(--text)', resize: 'none', outline: 'none', background: 'rgba(255,255,255,.7)', lineHeight: 1.6 }}
              placeholder="Write your response here..." />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--gold-text)' }}>
                {wCount} word{wCount !== 1 ? 's' : ''}{wCount < 30 ? ' · min 30' : ' · ✓'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {saved && <span style={{ fontSize: 11, color: 'var(--green)' }}>Saved ✓</span>}
                <button className="du-btn du-btn-primary du-btn-sm" onClick={() => submit.mutate()}
                  disabled={submit.isPending || !text.trim()} style={{ opacity: submit.isPending || !text.trim() ? .6 : 1 }}>
                  <i className="ti ti-send" /> {submit.isPending ? 'Saving…' : week.mySubmission ? 'Update' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Sessions */}
      {week.sessions.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: 10 }}>Sessions</div>
          {week.sessions.map(session => {
            const getEmbed = (url: string) => {
              try {
                const u = new URL(url)
                if (u.hostname.includes('youtube') || u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.searchParams.get('v') ?? u.pathname.split('/').pop()}`
                if (u.hostname.includes('vimeo')) return `https://player.vimeo.com/video/${u.pathname.split('/').pop()}`
              } catch {}
              return url
            }
            return (
              <div key={session.id} style={{ background: 'var(--bg)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 10 }}>
                <div style={{ aspectRatio: '16/9' }}>
                  <iframe src={getEmbed(session.videoUrl)} title={session.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 'none' }} />
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{session.title}</div>
                  {session.description && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{session.description}</div>}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

export default function WeekPage() {
  const { weekNumber } = useParams<{ weekNumber: string }>()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()

  const cohortId: number = location.state?.cohortId ?? Number(searchParams.get('cohortId') ?? 0)
  const wn = Number(weekNumber)
  const [activeDay, setActiveDay] = useState(0)

  const { data, isLoading, error } = useQuery({
    queryKey: ['week', cohortId, wn],
    queryFn: () => studentsApi.getWeek(cohortId, wn).then(r => r.data),
    enabled: !!cohortId && !!wn,
    retry: false,
  })

  if (!cohortId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>Navigate here from your journey or dashboard.</p>
    </div>
  )

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '4px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (error || !data) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12 }}>
      <i className="ti ti-lock" style={{ fontSize: 40, color: 'var(--locked)' }} />
      <p style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600 }}>
        {(error as any)?.response?.data?.error ?? 'This week is locked or unavailable.'}
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>Complete the previous week to unlock this one.</p>
    </div>
  )

  const doneDays = data.days.filter(d => d.allTasksCompleted).length

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>
            Week {data.weekNumber} — {data.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
            Days {(data.weekNumber - 1) * 7 + 1}–{data.weekNumber * 7} · {doneDays} of 7 days completed{data.assignment ? ` · ${data.mySubmission ? '1' : '0'}/1 assignment` : ''}
          </div>
        </div>
        <span className="pill" style={{ background: doneDays === 7 ? 'var(--green-bg)' : 'var(--primary-light)', color: doneDays === 7 ? 'var(--green-text)' : 'var(--primary)' }}>
          <i className={`ti ${doneDays === 7 ? 'ti-check' : 'ti-bolt'}`} style={{ fontSize: 10 }} />
          {doneDays === 7 ? 'Complete' : 'In progress'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 300px', height: 'calc(100vh - 105px)', overflow: 'hidden' }}>
        <DayNav days={data.days} activeIdx={activeDay} currentDay={data.days[activeDay]?.dayNumber ?? 1} onSelect={setActiveDay} />
        {data.days[activeDay] && <DayCenter day={data.days[activeDay]} cohortId={cohortId} week={data} />}
        <WeekRight week={data} cohortId={cohortId} />
      </div>
    </>
  )
}
