import { apiClient as client } from './client'
import type { ProfileBadge } from './students'

export interface ChildSummary {
  id: string
  firstName: string
  lastName: string
}

export interface ChildWeek {
  weekNumber: number
  title: string
  daysCompleted: number
  assignmentSubmitted: boolean
  hasAssignment: boolean
}

export interface ChildDashboard {
  firstName: string
  lastName: string
  cohortName: string | null
  currentWeek: number
  currentDay: number
  currentStreak: number
  longestStreak: number
  tasksCompleted: number
  totalTasks: number
  badges: ProfileBadge[]
  weeks: ChildWeek[]
}

export const parentsApi = {
  getChildren: () => client.get<ChildSummary[]>('/parents/me/children'),
  getChildDashboard: (childId: string) =>
    client.get<ChildDashboard>(`/parents/children/${childId}/dashboard`),
}
