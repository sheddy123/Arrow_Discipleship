import { fireConfetti, playSfx } from '@/lib/gameFx'
import { useToastStore } from '@/store/toastStore'
import { useCelebrationStore } from '@/store/celebrationStore'

/** The XP/level fields shared by the task-complete and assignment responses. */
export interface XpOutcome {
  xpGained: number
  level: number
  levelTitle: string
  leveledUp: boolean
  weekComplete?: boolean
}

/**
 * Central place that turns a server response into game feedback: an XP toast +
 * sound, a confetti burst on a finished week, and the level-up modal (deduped
 * with the SignalR LevelUp push). Safe to call from any mutation's onSuccess.
 */
export function celebrateXp(res: XpOutcome) {
  if (res.xpGained > 0) {
    playSfx('task')
    useToastStore.getState().push({ kind: 'xp', title: `+${res.xpGained} XP` })
  }
  if (res.weekComplete) {
    fireConfetti({ count: 170, power: 15 })
    playSfx('week')
  }
  if (res.leveledUp) {
    useCelebrationStore.getState().showLevelUp({ level: res.level, title: res.levelTitle })
  }
}
