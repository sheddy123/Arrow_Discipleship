import { useEffect } from 'react'
import * as signalR from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useToastStore } from '@/store/toastStore'
import { useCelebrationStore } from '@/store/celebrationStore'
import { fireConfetti, playSfx } from '@/lib/gameFx'

/**
 * Student-side real-time connection. Listens for StreakUpdated and
 * BadgeUnlocked pushed by the GamificationService and surfaces them as toasts
 * while refreshing the affected queries.
 */
export function useStudentHub(enabled: boolean) {
  const qc = useQueryClient()
  const push = useToastStore(s => s.push)

  useEffect(() => {
    if (!enabled) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/cohort', {
        accessTokenFactory: () => localStorage.getItem('accessToken') ?? '',
      })
      .withAutomaticReconnect()
      .build()

    connection.on('StreakUpdated', (data: { currentStreak: number; longestStreak: number }) => {
      push({
        kind: 'streak',
        title: `${data.currentStreak}-day streak!`,
        message: data.currentStreak >= data.longestStreak ? 'New personal best — keep it going!' : 'Keep showing up daily.',
      })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
    })

    connection.on('BadgeUnlocked', (badge: { name: string; description: string }) => {
      push({ kind: 'badge', title: `Badge unlocked: ${badge.name}`, message: badge.description })
      playSfx('badge')
      fireConfetti({ count: 90, power: 12 })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['student-profile'] })
    })

    connection.on('LevelUp', (data: { level: number; title: string }) => {
      // The modal + confetti are driven by the celebration store (deduped with
      // the immediate HTTP response so we only celebrate once).
      useCelebrationStore.getState().showLevelUp(data)
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['student-profile'] })
    })

    connection.start().catch(() => { /* best-effort; UI still works without live events */ })

    return () => { connection.stop() }
  }, [enabled, qc, push])
}
