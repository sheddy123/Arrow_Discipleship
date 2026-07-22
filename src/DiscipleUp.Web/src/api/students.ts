import { apiClient as client } from './client'

export interface DashboardCohort {
  id: number
  name: string
  startDate: string
  currentWeek: number
  currentDay: number
  dayOfJourney: number
  totalWeeks: number
  totalDays: number
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

export interface LevelInfo {
  level: number
  title: string
  xp: number
  xpIntoLevel: number
  xpForNextLevel: number
}

export interface Dashboard {
  currentStreak: number
  longestStreak: number
  totalTasksCompleted: number
  level: LevelInfo
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
  totalWeeks: number
  totalDays: number
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
  xpGained: number
  xp: number
  level: number
  levelTitle: string
  leveledUp: boolean
}

export interface XpAwardResponse {
  xpGained: number
  xp: number
  level: number
  levelTitle: string
  leveledUp: boolean
}

export interface Quest {
  id: number
  type: string
  title: string
  description: string
  target: number
  progress: number
  rewardXp: number
  completed: boolean
  claimed: boolean
}

export interface ClaimQuestResponse {
  rewardXp: number
  xp: number
  level: number
  levelTitle: string
  leveledUp: boolean
}

export interface ProfileBadge {
  name: string
  description: string
  earned: boolean
  earnedAt: string | null
}

export interface StudentProfile {
  firstName: string
  lastName: string
  email: string
  timezone: string
  isOnLeaderboard: boolean
  level: LevelInfo
  badges: ProfileBadge[]
}

export interface LeaderboardEntry {
  rank: number
  name: string
  currentStreak: number
  tasksCompleted: number
  isMe: boolean
}

export interface Leaderboard {
  enrolled: boolean
  optedIn?: boolean
  entries?: LeaderboardEntry[]
}

export interface PrayerPost {
  id: number
  authorName: string
  content: string
  status: 'Pending' | 'Approved' | 'Rejected'
  createdAt: string
}

export interface Announcement {
  id: number
  title: string
  content: string
  authorName: string
  createdAt: string
}

export const studentsApi = {
  getDashboard: () => client.get<Dashboard>('/students/me/dashboard'),
  getJourney: () => client.get<Journey>('/students/me/journey'),
  getWeek: (cohortId: number, weekNumber: number) =>
    client.get<WeekContent>(`/cohorts/${cohortId}/weeks/${weekNumber}`),
  completeTask: (cohortId: number, taskId: number) =>
    client.post<TaskCompleteResponse>(`/cohorts/${cohortId}/tasks/${taskId}/complete`),
  uncompleteTask: (cohortId: number, taskId: number) =>
    client.delete(`/cohorts/${cohortId}/tasks/${taskId}/complete`),
  submitAssignment: (cohortId: number, assignmentId: number, textContent: string) =>
    client.post<XpAwardResponse & { message: string }>(`/cohorts/${cohortId}/assignments/${assignmentId}/submit`, { textContent }),
  markScriptureMemorized: (cohortId: number, weekNumber: number) =>
    client.post<XpAwardResponse & { memorized: boolean }>(`/cohorts/${cohortId}/weeks/${weekNumber}/scripture-memory`),
  unmarkScriptureMemorized: (cohortId: number, weekNumber: number) =>
    client.delete(`/cohorts/${cohortId}/weeks/${weekNumber}/scripture-memory`),
  getProfile: () => client.get<StudentProfile>('/students/me/profile'),
  setLeaderboardOptIn: (optIn: boolean) =>
    client.put('/students/me/leaderboard', { optIn }),
  getLeaderboard: () => client.get<Leaderboard>('/students/me/leaderboard'),
  getAnnouncements: () => client.get<Announcement[]>('/students/me/announcements'),
  getQuests: () => client.get<Quest[]>('/students/me/quests'),
  claimQuest: (id: number) => client.post<ClaimQuestResponse>(`/students/me/quests/${id}/claim`),
  getPrayerWall: (cohortId: number) =>
    client.get<PrayerPost[]>(`/cohorts/${cohortId}/prayer-wall`),
  postPrayerRequest: (cohortId: number, content: string) =>
    client.post(`/cohorts/${cohortId}/prayer-wall`, { content }),
}
