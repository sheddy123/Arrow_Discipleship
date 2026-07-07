import { useEffect } from 'react'
import * as signalR from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Opens a SignalR connection to /hubs/cohort, joins the mentor group for the
 * given cohort, and invalidates mentor queries when a new prayer request lands
 * so pending badges and queues update in real time.
 */
export function useMentorHub(cohortId: number | undefined) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!cohortId) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/cohort', {
        accessTokenFactory: () => localStorage.getItem('accessToken') ?? '',
      })
      .withAutomaticReconnect()
      .build()

    connection.on('PrayerRequestPending', () => {
      qc.invalidateQueries({ queryKey: ['mentor-prayers', cohortId] })
      qc.invalidateQueries({ queryKey: ['mentor-dashboard', cohortId] })
      qc.invalidateQueries({ queryKey: ['mentor-cohorts'] })
    })

    connection
      .start()
      .then(() => connection.invoke('JoinMentorGroup', cohortId))
      .catch(() => { /* connection is best-effort; queries still poll on focus */ })

    return () => { connection.stop() }
  }, [cohortId, qc])
}
