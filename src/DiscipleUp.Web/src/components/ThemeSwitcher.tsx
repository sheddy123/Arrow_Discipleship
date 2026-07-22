import { Droplet, Sun, Moon } from 'lucide-react'
import { useThemeStore, type Theme } from '@/store/themeStore'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'classic', label: 'Classic', icon: Droplet },
  { value: 'light-glass', label: 'Light glass', icon: Sun },
  { value: 'dark-glass', label: 'Dark glass', icon: Moon },
]

/**
 * Three-way theme switcher. `tone="dark"` styles it for placement on a dark
 * surface (e.g. the app sidebars); `tone="light"` for light backgrounds.
 */
export function ThemeSwitcher({
  tone = 'light',
  className,
}: {
  tone?: 'light' | 'dark'
  className?: string
}) {
  const { theme, setTheme } = useThemeStore()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg p-0.5',
        tone === 'dark' ? 'border border-white/10 bg-white/5' : 'border border-border bg-muted/50',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-md transition-colors',
              active
                ? 'bg-[var(--du-primary)] text-white shadow-sm'
                : tone === 'dark'
                  ? 'text-white/55 hover:bg-white/10 hover:text-white'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
