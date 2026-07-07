import { apiClient as client } from './client'

export interface DashboardCohort {
  id: number
  name: string
  startDate: string
  currentWeek: number
  currentDay: number
  dayOfJourney: number
}

export interface DashboardTask {
  id: number
  title: string
  isCompleted: boolean
}

export interface DashboardBadge {
  name: string
  iconUrl: string
  earnedAt: string
}

export interface Dashboard {
  currentStreak: number
  longestStreak: number
  totalTasksCompleted: number
  cohort: DashboardCohort | null
  todaysTasks: DashboardTask[]
  recentBadges: DashboardBadge[]
}

export type WeekStatus = 'Locked' | 'InProgress' | 'Completed'

export interface WeekCard {
  weekId: number
  weekNumber: number
  title: string
  description: string | null
  status: WeekStatus
  daysCompleted: number
  hasAssignment: boolean
  assignmentSubmitted: boolean
}

export interface Journey {
  cohortId: number
  cohortName: string
  currentWeek: number
  currentDay: number
  weeks: WeekCard[]
}

export interface StudentTask {
  id: number
  title: string
  description: string
  orderIndex: number
  isCompleted: boolean
}

export interface DayContent {
  id: number
  dayNumber: number
  title: string
  devotionText: string
  scriptureReference: string
  scriptureText: string
  tasks: StudentTask[]
  allTasksCompleted: boolean
}

export interface WeekSession {
  id: number
  title: string
  videoUrl: string
  description: string | null
}

export interface WeekAssignment {
  id: number
  title: string
  description: string
  allowsFileUpload: boolean
}

export interface WeekSubmission {
  id: number
  textContent: string | null
  fileUrl: string | null
  fileName: string | null
  submittedAt: string
  mentorFeedback: string | null
}

export interface WeekContent {
  weekId: number
  weekNumber: number
  title: string
  days: DayContent[]
  assignment: WeekAssignment | null
  mySubmission: WeekSubmission | null
  scriptureMemorized: boolean
  sessions: WeekSession[]
}

export interface TaskCompleteResponse {
  allDayTasksDone: boolean
  weekComplete: boolean
  newStreak: number
}

export const studentsApi = {
  getDashboard: () => client.get<Dashboard>('/api/students/me/dashboard'),
  getJourney: () => client.get<Journey>('/api/students/me/journey'),
  getWeek: (cohortId: number, weekNumber: number) =>
    client.get<WeekContent>(`/api/cohorts/${cohortId}/weeks/${weekNumber}`),
  completeTask: (cohortId: number, taskId: number) =>
    client.post<TaskCompleteResponse>(`/api/cohorts/${cohortId}/tasks/${taskId}/complete`),
  uncompleteTask: (cohortId: number, taskId: number) =>
    client.delete(`/api/cohorts/${cohortId}/tasks/${taskId}/complete`),
  submitAssignment: (cohortId: number, assignmentId: number, textContent: string) =>
    client.post(`/api/cohorts/${cohortId}/assignments/${assignmentId}/submit`, { textContent }),
  markScriptureMemorized: (cohortId: number, weekNumber: number) =>
    client.post(`/api/cohorts/${cohortId}/weeks/${weekNumber}/scripture-memory`),
  unmarkScriptureMemorized: (cohortId: number, weekNumber: number) =>
    client.delete(`/api/cohorts/${cohortId}/weeks/${weekNumber}/scripture-memory`),
}
