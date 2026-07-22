import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { studentsApi } from '@/api/students'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { PageSkeleton } from '@/components/Skeleton'
import { isSoundOn, setSoundOn, playSfx } from '@/lib/gameFx'

const BADGE_ICONS: Record<string, string> = {
  'Getting Started': '🌱',
  '7-Day Warrior': '⚔️',
  'Journey Finisher': '🏁',
  'First Step': '👣',
  'Week Champion': '🏆',
  'Perfect Week': '💎',
}

export default function ProfilePage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [sound, setSound] = useState(isSoundOn())

  const logout = useMutation({
    mutationFn: () => authApi.logout(localStorage.getItem('refreshToken') ?? ''),
    onSettled: () => { clearAuth(); navigate('/login') },
  })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => studentsApi.getProfile().then(r => r.data),
  })

  const optIn = useMutation({
    mutationFn: (value: boolean) => studentsApi.setLeaderboardOptIn(value),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['student-profile'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
    },
  })

  if (isLoading || !profile) return <PageSkeleton variant="list" />


  const earnedCount = profile.badges.filter(b => b.earned).length

  return (
    <div className="du-pad" style={{ padding: '24px 32px 40px', maxWidth: 680 }}>
      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)', marginBottom: 22 }}>My Profile</div>

      {/* Identity card */}
      <div style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderRadius: 14, padding: '20px 22px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--shadow)' }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, background: 'linear-gradient(135deg,var(--primary-mid),var(--du-primary))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 19 }}>
          {profile.firstName[0]}{profile.lastName[0]}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{profile.firstName} {profile.lastName}</div>
          <div style={{ fontSize: 13, color: 'var(--du-muted)', marginTop: 2 }}>{profile.email} · {profile.timezone}</div>
        </div>
      </div>

      {/* Level card */}
      {profile.level && (() => {
        const lv = profile.level
        const pct = Math.min(100, Math.round((lv.xpIntoLevel / lv.xpForNextLevel) * 100))
        return (
          <div style={{ background: 'linear-gradient(135deg,#0C2430,#0E7490)', borderRadius: 16, padding: '20px 22px', marginBottom: 18, color: '#fff', display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
              <svg width="68" height="68" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r="30" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="7" />
                <circle cx="34" cy="34" r="30" fill="none" stroke="#FCD34D" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 30} strokeDashoffset={2 * Math.PI * 30 * (1 - pct / 100)}
                  style={{ transformOrigin: 'center', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset .6s' }} />
                <text x="34" y="39" textAnchor="middle" fontFamily="Sora,sans-serif" fontSize="22" fontWeight="800" fill="#fff">{lv.level}</text>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#FCD34D' }}>Level {lv.level} · {lv.title}</div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, margin: '2px 0 8px' }}>{lv.xp.toLocaleString()} XP total</div>
              <div style={{ height: 7, background: 'rgba(255,255,255,.15)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#FCD34D,#F97316)', borderRadius: 10, transition: 'width .6s' }} />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 5 }}>{lv.xpForNextLevel - lv.xpIntoLevel} XP to level {lv.level + 1}</div>
            </div>
          </div>
        )
      })()}

      {/* Sound toggle */}
      <div style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderRadius: 14, padding: '18px 22px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow)' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            <i className="ti ti-volume" style={{ color: 'var(--du-primary)', marginRight: 6 }} />
            Sound effects
          </div>
          <div style={{ fontSize: 12, color: 'var(--du-muted)', marginTop: 3 }}>
            Play a sound when you earn XP, badges, or level up.
          </div>
        </div>
        <button
          onClick={() => { const next = !sound; setSound(next); setSoundOn(next); if (next) playSfx('task') }}
          style={{
            width: 48, height: 26, borderRadius: 20, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s',
            background: sound ? 'var(--du-primary)' : 'var(--border-strong)',
          }}
          aria-label="Toggle sound effects"
        >
          <span style={{
            position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s',
            left: sound ? 25 : 3, boxShadow: '0 1px 4px rgba(0,0,0,.2)',
          }} />
        </button>
      </div>

      {/* Leaderboard opt-in */}
      <div style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderRadius: 14, padding: '18px 22px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow)' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            <i className="ti ti-trophy" style={{ color: 'var(--gold)', marginRight: 6 }} />
            Cohort leaderboard
          </div>
          <div style={{ fontSize: 12, color: 'var(--du-muted)', marginTop: 3 }}>
            {profile.isOnLeaderboard
              ? 'Your name and streak are visible to your cohort.'
              : 'Opt in to appear on the cohort leaderboard.'}
          </div>
        </div>
        <button
          onClick={() => optIn.mutate(!profile.isOnLeaderboard)}
          disabled={optIn.isPending}
          style={{
            width: 48, height: 26, borderRadius: 20, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background .2s',
            background: profile.isOnLeaderboard ? 'var(--green)' : 'var(--border-strong)',
          }}
          aria-label="Toggle leaderboard visibility"
        >
          <span style={{
            position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s',
            left: profile.isOnLeaderboard ? 25 : 3, boxShadow: '0 1px 4px rgba(0,0,0,.2)',
          }} />
        </button>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Badges</div>
        <span className="pill pill-gold">{earnedCount}/{profile.badges.length} earned</span>
      </div>
      <div className="du-grid-2" style={{ gap: 12 }}>
        {profile.badges.map(badge => (
          <div key={badge.name} style={{
            background: badge.earned ? 'var(--surface-gold-bg)' : 'var(--locked-bg)',
            border: `1.5px solid ${badge.earned ? 'var(--surface-gold-border)' : 'var(--du-border)'}`,
            borderRadius: 14, padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
            opacity: badge.earned ? 1 : .65,
          }}>
            <span style={{ fontSize: 28, filter: badge.earned ? 'none' : 'grayscale(1)' }}>
              {BADGE_ICONS[badge.name] ?? '🎖️'}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: badge.earned ? 'var(--gold-text)' : 'var(--locked)' }}>{badge.name}</div>
              <div style={{ fontSize: 11, color: badge.earned ? 'var(--gold-text)' : 'var(--du-muted)', opacity: .85, marginTop: 2, lineHeight: 1.5 }}>
                {badge.description}
              </div>
              {badge.earned && badge.earnedAt && (
                <div style={{ fontSize: 10, color: 'var(--gold-text)', opacity: .7, marginTop: 4 }}>
                  Earned {new Date(badge.earnedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sign out */}
      <button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="du-btn"
        style={{
          width: '100%', justifyContent: 'center', marginTop: 22,
          background: 'var(--red-bg)', color: 'var(--red)', border: '1.5px solid var(--red)',
          opacity: logout.isPending ? 0.6 : 1,
        }}
      >
        <i className="ti ti-logout" /> {logout.isPending ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  )
}
