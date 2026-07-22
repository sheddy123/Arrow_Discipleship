import { useEffect } from 'react'
import { useCelebrationStore } from '@/store/celebrationStore'
import { fireConfetti, playSfx } from '@/lib/gameFx'

/**
 * Full-screen level-up celebration. Mounted once (in the student layout); it
 * listens to the celebration store and, whenever a level-up lands, fires
 * confetti + a fanfare and shows a dismissible modal.
 */
export default function CelebrationLayer() {
  const levelUp = useCelebrationStore((s) => s.levelUp)
  const clear = useCelebrationStore((s) => s.clearLevelUp)

  useEffect(() => {
    if (!levelUp) return
    playSfx('levelup')
    fireConfetti({ count: 220, power: 16, spread: Math.PI })
    const burst = setTimeout(() => fireConfetti({ count: 120, power: 13, origin: { x: window.innerWidth * 0.3, y: window.innerHeight * 0.35 } }), 250)
    const auto = setTimeout(clear, 4600)
    return () => { clearTimeout(burst); clearTimeout(auto) }
  }, [levelUp, clear])

  if (!levelUp) return null

  return (
    <div
      onClick={clear}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(8,12,24,.62)', backdropFilter: 'blur(3px)',
        animation: 'du-fade-in .25s ease',
      }}
    >
      <style>{`
        @keyframes du-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes du-pop { 0% { transform: scale(.7); opacity: 0 } 60% { transform: scale(1.05) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes du-ring { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes du-badge-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: 340, maxWidth: '86vw', textAlign: 'center',
          background: 'linear-gradient(160deg,#0C2430 0%,#0E7490 60%,#0891B2 100%)',
          borderRadius: 24, padding: '38px 30px 30px', color: '#fff',
          boxShadow: '0 30px 80px rgba(8,145,178,.45)', overflow: 'hidden',
          animation: 'du-pop .5s cubic-bezier(.21,1.02,.73,1)',
        }}
      >
        <div style={{ position: 'absolute', top: -60, left: '50%', marginLeft: -110, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(252,211,77,.35),transparent 70%)' }} />

        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 108, height: 108, marginBottom: 18, animation: 'du-badge-float 2.4s ease-in-out infinite' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px dashed rgba(252,211,77,.55)', animation: 'du-ring 9s linear infinite' }} />
          <div style={{
            width: 84, height: 84, borderRadius: '50%',
            background: 'linear-gradient(135deg,#FCD34D,#F97316)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 34, color: '#3b1d00',
            boxShadow: '0 8px 24px rgba(249,115,22,.5)',
          }}>
            {levelUp.level}
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#FCD34D', marginBottom: 6 }}>
          Level up!
        </div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 26, marginBottom: 4 }}>
          Level {levelUp.level}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', marginBottom: 22 }}>
          You're now a <span style={{ fontWeight: 700, color: '#fff' }}>{levelUp.title}</span> 🎉
        </div>

        <button
          onClick={clear}
          style={{
            width: '100%', border: 'none', borderRadius: 12, padding: '12px 0', cursor: 'pointer',
            fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14,
            background: '#fff', color: '#0E7490',
          }}
        >
          Keep going
        </button>
      </div>
    </div>
  )
}
