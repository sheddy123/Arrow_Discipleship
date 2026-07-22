import { apiClient as client } from './client'

export interface MentorCohortSummary {
  id: number
  name: string
  startDate: string
  status: string
  studentCount: number
  pendingSubmissions: number
  pendingPrayerRequests: number
}

export interface MentorStudentRow {
  studentId: string
  firstName: string
  lastName: string
  email: string
  currentWeek: number
  currentDay: number
  currentStreak: number
  tasksCompleted: number
  totalTasks: number
  submissionCount: number
  lastActivityDate: string | null
  atRisk: boolean
}

export interface MentorDashboard {
  cohort: MentorCohortSummary
  avgTasksCompleted: number
  onTrackCount: number
  atRiskCount: number
  students: MentorStudentRow[]
}

export interface ReviewSubmission {
  id: number
  studentId: string
  studentName: string
  weekNumber: number
  assignmentTitle: string
  textContent: string | null
  fileUrl: string | null
  fileName: string | null
  submittedAt: string
  feedback: string | null
  feedbackAt: string | null
}

export interface ProfileWeek {
  weekNumber: number
  title: string
  daysCompleted: number
  tasksCompleted: number
  totalTasks: number
  assignmentSubmitted: boolean
  hasAssignment: boolean
  manuallyUnlocked: boolean
}

export interface ProfileSubmission {
  id: number
  weekNumber: number
  assignmentTitle: string
  textContent: string | null
  submittedAt: string
  feedback: string | null
}

export interface MentorStudentProfile {
  studentId: string
  firstName: string
  lastName: string
  email: string
  currentWeek: number
  currentDay: number
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
  enrolledAt: string
  weeks: ProfileWeek[]
  submissions: ProfileSubmission[]
}

export interface Announcement {
  id: number
  title: string
  content: string
  authorName: string
  createdAt: string
}

export interface PrayerPost {
  id: number
  authorName: string
  content: string
  status: 'Pending' | 'Approved' | 'Rejected'
  createdAt: string
}

export interface RosterMentor {
  id: string
  name: string
  email: string
  isLead: boolean
  studentCount: number
}

export interface RosterStudent {
  id: string
  name: string
  email: string
  mentorId: string | null
  mentorName: string | null
}

export interface CohortRoster {
  mentors: RosterMentor[]
  students: RosterStudent[]
}

export const mentorsApi = {
  getCohorts: () => client.get<MentorCohortSummary[]>('/mentor/cohorts'),
  getRoster: (cohortId: number) =>
    client.get<CohortRoster>(`/mentor/cohorts/${cohortId}/roster`),
  assignStudentMentor: (cohortId: number, studentId: string, mentorId: string | null) =>
    client.put(`/mentor/cohorts/${cohortId}/students/${studentId}/mentor`, { mentorId }),
  autoAssignMentors: (cohortId: number, redistributeAll: boolean) =>
    client.post<{ changed: number }>(`/mentor/cohorts/${cohortId}/auto-assign-mentors`, { redistributeAll }),
  getDashboard: (cohortId: number) =>
    client.get<MentorDashboard>(`/mentor/cohorts/${cohortId}/dashboard`),
  getSubmissions: (cohortId: number, pendingOnly = false) =>
    client.get<ReviewSubmission[]>(`/mentor/cohorts/${cohortId}/submissions`, { params: { pendingOnly } }),
  leaveFeedback: (submissionId: number, comment: string) =>
    client.post(`/mentor/submissions/${submissionId}/feedback`, { comment }),
  getStudentProfile: (cohortId: number, studentId: string) =>
    client.get<MentorStudentProfile>(`/mentor/cohorts/${cohortId}/students/${studentId}`),
  unlockWeek: (cohortId: number, studentId: string, weekNumber: number) =>
    client.post(`/mentor/cohorts/${cohortId}/unlock`, { studentId, weekNumber }),
  createAnnouncement: (cohortId: number, title: string, content: string) =>
    client.post(`/mentor/cohorts/${cohortId}/announcements`, { title, content }),
  getAnnouncements: (cohortId: number) =>
    client.get<Announcement[]>(`/mentor/cohorts/${cohortId}/announcements`),
  deleteAnnouncement: (cohortId: number, id: number) =>
    client.delete(`/mentor/cohorts/${cohortId}/announcements/${id}`),
  addSession: (cohortId: number, weekNumber: number, title: string, videoUrl: string, description?: string) =>
    client.post(`/mentor/cohorts/${cohortId}/sessions`, { weekNumber, title, videoUrl, description }),
  getPrayerRequests: (cohortId: number, status?: string) =>
    client.get<PrayerPost[]>(`/mentor/cohorts/${cohortId}/prayer-requests`, { params: { status } }),
  approvePrayer: (id: number) => client.post(`/mentor/prayer-requests/${id}/approve`),
  rejectPrayer: (id: number) => client.post(`/mentor/prayer-requests/${id}/reject`),
  unapprovePrayer: (id: number) => client.post(`/mentor/prayer-requests/${id}/unapprove`),
}
