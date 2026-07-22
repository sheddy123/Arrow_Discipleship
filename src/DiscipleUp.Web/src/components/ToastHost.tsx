import { useToastStore } from '@/store/toastStore'

const KIND_STYLE = {
  streak: { icon: '🔥', bg: 'linear-gradient(135deg,#F59E0B,#F97316)' },
  badge:  { icon: '🏅', bg: 'linear-gradient(135deg,#0E7490,#0891B2)' },
  info:   { icon: 'ℹ️', bg: 'linear-gradient(135deg,#334155,#475569)' },
  xp:     { icon: '⚡', bg: 'linear-gradient(135deg,#7C3AED,#4F46E5)' },
} as const

export default function ToastHost() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`@keyframes toast-in{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      {toasts.map(toast => {
        const style = KIND_STYLE[toast.kind]
        return (
          <div
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            style={{
              background: style.bg, color: '#fff', borderRadius: 14, padding: '14px 18px',
              minWidth: 260, maxWidth: 340, cursor: 'pointer', boxShadow: '0 8px 30px rgba(0,0,0,.25)',
              display: 'flex', alignItems: 'center', gap: 12,
              animation: 'toast-in .35s cubic-bezier(.21,1.02,.73,1)',
            }}
          >
            <span style={{ fontSize: 26 }}>{style.icon}</span>
            <div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14 }}>{toast.title}</div>
              {toast.message && <div style={{ fontSize: 12, opacity: .85, marginTop: 2 }}>{toast.message}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
