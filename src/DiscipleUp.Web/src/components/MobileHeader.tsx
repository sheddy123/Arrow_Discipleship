import { useState } from 'react'
import { LogOut } from 'lucide-react'

export interface HeaderMenuItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}

/**
 * Sticky mobile top bar: brand wordmark + an avatar menu (role links + sign out).
 * Uses a plain state-driven dropdown (no portal library) so it is reliable on
 * touch devices and can never blank the page.
 */
export function MobileHeader({ name, initials, items, onSignOut }: {
  name?: string
  initials: string
  items?: HeaderMenuItem[]
  onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--du-border)] px-4 py-3"
      style={{ background: 'var(--surface-bar)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)' }}
    >
      <span className="font-[Sora,sans-serif] text-lg font-extrabold tracking-tight text-[var(--text)]">
        Disciple<span className="text-[var(--gold)]">Up</span>
      </span>

      <div className="relative">
        <button
          type="button"
          aria-label="Account menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex size-9 items-center justify-center rounded-full font-[Sora,sans-serif] text-sm font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--du-primary)]"
          style={{ background: 'linear-gradient(135deg,var(--primary-mid),var(--du-primary))' }}
        >
          {initials || 'U'}
        </button>

        {open && (
          <>
            {/* Tap-away backdrop */}
            <div className="fixed inset-0" style={{ zIndex: 50 }} onClick={close} aria-hidden />

            <div
              role="menu"
              className="absolute right-0 w-56 overflow-hidden rounded-xl border border-[var(--du-border)] p-1.5 shadow-xl"
              style={{
                top: 'calc(100% + 8px)', zIndex: 60,
                // Opaque chrome surface (+ blur) so page content never shows
                // through — --du-card is intentionally translucent in glass themes.
                background: 'var(--surface-bar)',
                backdropFilter: 'blur(16px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
              }}
            >
              {name && (
                <div className="truncate px-3 py-2 text-xs font-medium text-[var(--du-muted)]">{name}</div>
              )}

              {items?.map((it) => (
                <button
                  key={it.label}
                  type="button"
                  role="menuitem"
                  onClick={() => { close(); it.onClick() }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--text)] transition-colors active:bg-black/5"
                >
                  <it.icon className="size-4" />
                  {it.label}
                </button>
              ))}

              <div className="my-1 h-px bg-[var(--du-border)]" />

              <button
                type="button"
                role="menuitem"
                onClick={() => { close(); onSignOut() }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors"
                style={{ color: 'var(--red)' }}
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
