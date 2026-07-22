import { create } from 'zustand'

export type Theme = 'classic' | 'light-glass' | 'dark-glass'

const STORAGE_KEY = 'du-theme'
const THEMES: Theme[] = ['classic', 'light-glass', 'dark-glass']

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  // shadcn's dark tokens live under `.dark`; reuse them for the dark-glass theme
  root.classList.toggle('dark', theme === 'dark-glass')
}

function loadTheme(): Theme {
  const t = localStorage.getItem(STORAGE_KEY) as Theme | null
  return t && THEMES.includes(t) ? t : 'classic'
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: loadTheme(),
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme)
    applyTheme(theme)
    set({ theme })
  },
}))

// Apply the persisted theme as soon as this module is imported (before first paint).
applyTheme(loadTheme())
