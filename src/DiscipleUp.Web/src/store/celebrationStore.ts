import { create } from 'zustand'

export interface LevelUp {
  level: number
  title: string
}

interface CelebrationState {
  levelUp: LevelUp | null
  /** Highest level already celebrated this session — dedupes the two channels
   *  (the task/assignment HTTP response and the SignalR LevelUp push). */
  lastLevel: number
  showLevelUp: (data: LevelUp) => void
  clearLevelUp: () => void
}

export const useCelebrationStore = create<CelebrationState>((set) => ({
  levelUp: null,
  lastLevel: 0,
  showLevelUp: (data) =>
    set((s) => (s.lastLevel >= data.level ? s : { levelUp: data, lastLevel: data.level })),
  clearLevelUp: () => set({ levelUp: null }),
}))
