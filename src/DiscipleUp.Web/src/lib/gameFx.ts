/**
 * Dependency-free "juice" for game mode: a canvas confetti burst and short
 * Web-Audio sound cues. No assets, no libraries. Honours prefers-reduced-motion
 * (skips confetti) and a persisted sound toggle.
 */

// ── Sound ───────────────────────────────────────────────────────────────────

const SOUND_KEY = 'du-sound'

export function isSoundOn(): boolean {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(SOUND_KEY) !== 'off'
}

export function setSoundOn(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off') } catch { /* ignore */ }
}

let audioCtx: AudioContext | null = null
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    try { audioCtx = new AC() } catch { return null }
  }
  return audioCtx
}

function tone(freq: number, startAt: number, dur: number, type: OscillatorType = 'sine', peak = 0.09) {
  const ac = ctx()
  if (!ac) return
  const t0 = ac.currentTime + startAt
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export type Sfx = 'task' | 'badge' | 'week' | 'levelup'

export function playSfx(kind: Sfx) {
  if (!isSoundOn()) return
  // Resume if the browser suspended the context until a gesture.
  ctx()?.resume?.().catch(() => { /* ignore */ })
  switch (kind) {
    case 'task':
      tone(660, 0, 0.14, 'triangle', 0.06)
      break
    case 'badge':
      tone(523.25, 0, 0.16, 'sine'); tone(783.99, 0.09, 0.22, 'sine')
      break
    case 'week':
      tone(523.25, 0, 0.28); tone(659.25, 0, 0.28); tone(783.99, 0, 0.38)
      break
    case 'levelup':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.1, 0.26, 'triangle', 0.09))
      break
  }
}

// ── Confetti ─────────────────────────────────────────────────────────────────

interface Particle {
  x: number; y: number; vx: number; vy: number
  rot: number; vr: number; size: number; color: string; life: number; shape: number
}

const COLORS = ['#22D3EE', '#F5C36B', '#5EEAD4', '#A5F3FC', '#FCD34D', '#F97316', '#34D399']

let canvas: HTMLCanvasElement | null = null
let c2d: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let raf = 0

function reducedMotion(): boolean {
  return typeof window !== 'undefined'
    && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function ensureCanvas() {
  if (canvas || typeof document === 'undefined') return
  canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000'
  document.body.appendChild(canvas)
  c2d = canvas.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
}

function resize() {
  if (!canvas || !c2d) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.floor(window.innerWidth * dpr)
  canvas.height = Math.floor(window.innerHeight * dpr)
  c2d.setTransform(dpr, 0, 0, dpr, 0, 0)
}

export function fireConfetti(opts: { count?: number; origin?: { x: number; y: number }; spread?: number; power?: number } = {}) {
  if (reducedMotion()) return
  ensureCanvas()
  if (!canvas) return

  const count = opts.count ?? 120
  const ox = opts.origin?.x ?? window.innerWidth / 2
  const oy = opts.origin?.y ?? window.innerHeight / 3
  const spread = opts.spread ?? Math.PI * 0.9
  const power = opts.power ?? 13

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread
    const speed = power * (0.5 + Math.random())
    particles.push({
      x: ox, y: oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 7,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      life: 1,
      shape: (Math.random() * 2) | 0,
    })
  }
  if (!raf) raf = requestAnimationFrame(tick)
}

function tick() {
  if (!c2d || !canvas) { raf = 0; return }
  c2d.clearRect(0, 0, canvas.width, canvas.height)

  for (const p of particles) {
    p.vy += 0.35            // gravity
    p.vx *= 0.99            // drag
    p.x += p.vx
    p.y += p.vy
    p.rot += p.vr
    p.life -= 0.008

    c2d.save()
    c2d.translate(p.x, p.y)
    c2d.rotate(p.rot)
    c2d.globalAlpha = Math.max(0, p.life)
    c2d.fillStyle = p.color
    if (p.shape === 0) c2d.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
    else { c2d.beginPath(); c2d.arc(0, 0, p.size / 2, 0, Math.PI * 2); c2d.fill() }
    c2d.restore()
  }

  particles = particles.filter(p => p.life > 0 && p.y < window.innerHeight + 60)
  if (particles.length) raf = requestAnimationFrame(tick)
  else { raf = 0; c2d.clearRect(0, 0, canvas.width, canvas.height) }
}
