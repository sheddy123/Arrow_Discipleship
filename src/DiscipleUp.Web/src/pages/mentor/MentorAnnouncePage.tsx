import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mentorsApi } from '@/api/mentors'
import { useMentorCohort } from '@/hooks/useMentorCohort'

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--border)', borderRadius: 10,
  padding: '11px 14px', fontFamily: 'Inter,sans-serif', fontSize: 13,
  color: 'var(--text)', outline: 'none', background: 'var(--card)',
}

function AnnouncementComposer({ cohortId }: { cohortId: number }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const create = useMutation({
    mutationFn: () => mentorsApi.createAnnouncement(cohortId, title, content),
    onSuccess: () => {
      setTitle(''); setContent('')
      qc.invalidateQueries({ queryKey: ['mentor-announcements', cohortId] })
    },
  })

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', marginBottom: 22, boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-speakerphone" style={{ fontSize: 11 }} /> Broadcast to cohort
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" style={{ ...inputStyle, marginBottom: 10 }} />
      <textarea rows={3} value={content} onChange={e => setContent(e.target.value)} placeholder="Message to all students…" style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="du-btn du-btn-primary du-btn-sm"
          onClick={() => create.mutate()}
          disabled={create.isPending || !title.trim() || !content.trim()}
          style={{ opacity: create.isPending || !title.trim() || !content.trim() ? .6 : 1 }}>
          <i className="ti ti-send" /> {create.isPending ? 'Sending…' : 'Broadcast'}
        </button>
      </div>
    </div>
  )
}

function SessionForm({ cohortId }: { cohortId: number }) {
  const [week, setWeek] = useState(1)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [desc, setDesc] = useState('')
  const [saved, setSaved] = useState(false)

  const add = useMutation({
    mutationFn: () => mentorsApi.addSession(cohortId, week, title, url, desc || undefined),
    onSuccess: () => { setTitle(''); setUrl(''); setDesc(''); setSaved(true) },
  })

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', boxShadow: 'var(--shadow)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--coral)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-video" style={{ fontSize: 11 }} /> Add session video
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, marginBottom: 10 }}>
        <select value={week} onChange={e => setWeek(Number(e.target.value))} style={inputStyle}>
          {[1, 2, 3, 4].map(w => <option key={w} value={w}>Week {w}</option>)}
        </select>
        <input value={title} onChange={e => { setTitle(e.target.value); setSaved(false) }} placeholder="Session title" style={inputStyle} />
      </div>
      <input value={url} onChange={e => { setUrl(e.target.value); setSaved(false) }} placeholder="YouTube or Vimeo URL" style={{ ...inputStyle, marginBottom: 10 }} />
      <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" style={inputStyle} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 10 }}>
        {saved && <span style={{ fontSize: 12, color: 'var(--green)' }}>Session added ✓</span>}
        {add.isError && <span style={{ fontSize: 12, color: 'var(--red)' }}>
          {(add.error as any)?.response?.data?.error ?? 'Failed to add session.'}
        </span>}
        <button className="du-btn du-btn-secondary du-btn-sm"
          onClick={() => add.mutate()}
          disabled={add.isPending || !title.trim() || !url.trim()}
          style={{ opacity: add.isPending || !title.trim() || !url.trim() ? .6 : 1 }}>
          <i className="ti ti-plus" /> {add.isPending ? 'Adding…' : 'Add session'}
        </button>
      </div>
    </div>
  )
}

export default function MentorAnnouncePage() {
  const { cohort } = useMentorCohort()

  const { data: announcements } = useQuery({
    queryKey: ['mentor-announcements', cohort?.id],
    queryFn: () => mentorsApi.getAnnouncements(cohort!.id).then(r => r.data),
    enabled: !!cohort,
  })

  if (!cohort) return null

  return (
    <div style={{ padding: '24px 32px 40px', maxWidth: 760 }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>Announcements & Sessions</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{cohort.name}</div>
      </div>

      <AnnouncementComposer cohortId={cohort.id} />
      <div style={{ marginBottom: 22 }}>
        <SessionForm cohortId={cohort.id} />
      </div>

      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 12 }}>Past announcements</div>
      {!announcements?.length && <p style={{ fontSize: 13, color: 'var(--muted)' }}>No announcements yet.</p>}
      {announcements?.map(a => (
        <div key={a.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{a.title}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.authorName} · {new Date(a.createdAt).toLocaleString()}</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{a.content}</div>
        </div>
      ))}
    </div>
  )
}
