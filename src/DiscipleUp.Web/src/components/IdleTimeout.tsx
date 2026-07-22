import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'

// Total inactivity allowed before sign-out, and how long the countdown dialog is
// shown before that. Dialog appears at (LIMIT − WARN); sign-out lands at LIMIT.
const IDLE_LIMIT_MS = 5 * 60 * 1000
const WARN_BEFORE_MS = 60 * 1000
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'click']

/**
 * Signs the user out after IDLE_LIMIT_MS of no interaction. A dialog with a live
 * countdown appears WARN_BEFORE_MS beforehand so they can stay signed in. Mounted
 * once globally; inert until the user is authenticated.
 */
export default function IdleTimeout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()

  const [warning, setWarning] = useState(false)
  const [remaining, setRemaining] = useState(Math.round(WARN_BEFORE_MS / 1000))

  const warningRef = useRef(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const tick = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const clearTimers = useCallback(() => {
    clearTimeout(idleTimer.current)
    clearInterval(tick.current)
  }, [])

  const signOut = useCallback(() => {
    clearTimers()
    warningRef.current = false
    setWarning(false)
    const rt = localStorage.getItem('refreshToken')
    if (rt) authApi.logout(rt).catch(() => { /* best-effort server revoke */ })
    clearAuth()
    navigate('/login')
  }, [clearTimers, clearAuth, navigate])

  const beginWarning = useCallback(() => {
    warningRef.current = true
    setWarning(true)
    setRemaining(Math.round(WARN_BEFORE_MS / 1000))
    clearInterval(tick.current)
    tick.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { signOut(); return 0 }
        return r - 1
      })
    }, 1000)
  }, [signOut])

  const armIdle = useCallback(() => {
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(beginWarning, IDLE_LIMIT_MS - WARN_BEFORE_MS)
  }, [beginWarning])

  // "Stay signed in" — dismiss the dialog and restart the idle clock.
  const stay = useCallback(() => {
    warningRef.current = false
    setWarning(false)
    clearInterval(tick.current)
    armIdle()
  }, [armIdle])

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers()
      warningRef.current = false
      setWarning(false)
      return
    }
    // Any interaction resets the clock — unless the warning is already up, in
    // which case the user must explicitly choose to stay.
    const onActivity = () => { if (!warningRef.current) armIdle() }
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    armIdle()
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
      clearTimers()
    }
  }, [isAuthenticated, armIdle, clearTimers])

  if (!warning) return null

  const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Session expiring"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(8,12,24,.6)', backdropFilter: 'blur(3px)', padding: 20,
        animation: 'du-fade-in .2s ease',
      }}
    >
      <style>{`@keyframes du-fade-in{from{opacity:0}to{opacity:1}}`}</style>
      <div style={{
        width: 360, maxWidth: '90vw', textAlign: 'center',
        background: 'var(--surface-bar)', backdropFilter: 'blur(16px) saturate(1.4)', WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
        borderRadius: 18, padding: '30px 26px 24px',
        boxShadow: '0 30px 70px rgba(0,0,0,.35)', border: '1px solid var(--du-border)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
          background: 'var(--surface-gold-bg)', color: 'var(--gold-text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-clock-exclamation" style={{ fontSize: 28 }} />
        </div>

        <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>
          Still there?
        </div>
        <div style={{ fontSize: 13, color: 'var(--du-muted)', lineHeight: 1.6, marginBottom: 16 }}>
          You've been inactive for a while. For your security we'll sign you out in
        </div>

        <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 34, color: 'var(--du-primary)', marginBottom: 20, fontVariantNumeric: 'tabular-nums' }}>
          {mmss}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="du-btn du-btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={signOut}>
            Sign out now
          </button>
          <button className="du-btn du-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={stay} autoFocus>
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}
