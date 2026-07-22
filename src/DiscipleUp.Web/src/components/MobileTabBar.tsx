import { cn } from '@/lib/utils'

export interface MobileTab {
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onClick: () => void
  badge?: number
}

/** Fixed bottom navigation for phones. Pair with `pb-[76px]` on the scroll area. */
export function MobileTabBar({ tabs }: { tabs: MobileTab[] }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--du-border)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--surface-bar)',
        backdropFilter: 'blur(12px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.label}
          onClick={t.onClick}
          aria-current={t.active ? 'page' : undefined}
          className={cn(
            'relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors',
            t.active ? 'text-[var(--du-primary)]' : 'text-[var(--du-muted)]',
          )}
        >
          <span className="relative">
            <t.icon className="size-[22px]" />
            {t.badge ? (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--red)] px-1 text-[9px] font-bold text-white">
                {t.badge}
              </span>
            ) : null}
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}
