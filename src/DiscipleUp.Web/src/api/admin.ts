import { apiClient } from './client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CohortSummary {
  id: number
  name: string
  startDate: string
  lateEntryWindowDays: number
  mentorId: string
  mentorName: string
  isPaid: boolean
  status: 'Draft' | 'Published' | 'Active' | 'Archived'
  weekCount: number
  enrolledStudents: number
}

export interface TaskItem {
  id: number
  title: string
  description?: string
  orderIndex: number
}

export interface Assignment {
  id: number
  title: string
  description: string
  allowsFileUpload: boolean
}

export interface DayItem {
  id: number
  dayNumber: number
  title: string
  devotionText: string
  scriptureReference?: string
  scriptureText?: string
  tasks: TaskItem[]
}

export interface WeekItem {
  id: number
  weekNumber: number
  title: string
  description?: string
  isPublished: boolean
  days: DayItem[]
  assignments: Assignment[]
}

export interface CohortDetail extends CohortSummary {
  weeks: WeekItem[]
}

export interface UserSummary {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
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

export type BadgeCriterion = 'None' | 'CurrentStreak' | 'TasksCompleted' | 'AssignmentsSubmitted'

export interface Badge {
  id: number
  type: string
  name: string
  description: string
  iconUrl: string | null
  criterion: BadgeCriterion
  threshold: number
  isCustom: boolean
  earnedCount: number
}

export interface BadgeInput {
  name: string
  description: string
  iconUrl?: string | null
  criterion: BadgeCriterion
  threshold: number
}

// ── Cohorts ───────────────────────────────────────────────────────────────────

export const adminApi = {
  // Cohorts
  listCohorts: () => apiClient.get<CohortSummary[]>('/admin/cohorts'),
  getCohort: (id: number) => apiClient.get<CohortDetail>(`/admin/cohorts/${id}`),
  createCohort: (data: { name: string; startDate: string; mentorId: string; lateEntryWindowDays: number; isPaid: boolean; weekCount: number }) =>
    apiClient.post<{ id: number; name: string; status: string }>('/admin/cohorts', data),
  updateCohort: (id: number, data: Partial<{ name: string; startDate: string; mentorId: string; lateEntryWindowDays: number; isPaid: boolean }>) =>
    apiClient.put(`/admin/cohorts/${id}`, data),
  publishCohort: (id: number) =>
    apiClient.post(`/admin/cohorts/${id}/publish`, {}),
  unpublishCohort: (id: number) =>
    apiClient.post(`/admin/cohorts/${id}/unpublish`, {}),
  deleteCohort: (id: number) =>
    apiClient.delete(`/admin/cohorts/${id}`),

  // Weeks
  addWeek: (cohortId: number, data: { title: string; description?: string }) =>
    apiClient.post(`/admin/cohorts/${cohortId}/weeks`, data),
  updateWeek: (cohortId: number, weekId: number, data: { title?: string; description?: string }) =>
    apiClient.put(`/admin/cohorts/${cohortId}/weeks/${weekId}`, data),
  deleteWeek: (cohortId: number, weekId: number) =>
    apiClient.delete(`/admin/cohorts/${cohortId}/weeks/${weekId}`),

  // Days
  addDay: (cohortId: number, weekId: number, data: { title: string; devotionText: string; scriptureReference?: string; scriptureText?: string }) =>
    apiClient.post(`/admin/cohorts/${cohortId}/weeks/${weekId}/days`, data),
  updateDay: (dayId: number, data: Partial<{ title: string; devotionText: string; scriptureReference: string; scriptureText: string }>) =>
    apiClient.put(`/admin/days/${dayId}`, data),
  deleteDay: (dayId: number) =>
    apiClient.delete(`/admin/days/${dayId}`),

  // Tasks
  addTask: (dayId: number, data: { title: string; description?: string; orderIndex?: number }) =>
    apiClient.post(`/admin/days/${dayId}/tasks`, data),
  updateTask: (taskId: number, data: Partial<{ title: string; description: string; orderIndex: number }>) =>
    apiClient.put(`/admin/tasks/${taskId}`, data),
  deleteTask: (taskId: number) =>
    apiClient.delete(`/admin/tasks/${taskId}`),

  // Assignments
  addAssignment: (cohortId: number, weekId: number, data: { title: string; description: string; allowsFileUpload?: boolean }) =>
    apiClient.post(`/admin/cohorts/${cohortId}/weeks/${weekId}/assignments`, data),
  updateAssignment: (assignmentId: number, data: Partial<{ title: string; description: string; allowsFileUpload: boolean }>) =>
    apiClient.put(`/admin/assignments/${assignmentId}`, data),

  // Enrolment
  enrolStudent: (cohortId: number, studentId: string) =>
    apiClient.post(`/admin/cohorts/${cohortId}/enrol`, { studentId }),
  moveStudent: (studentId: string, cohortId: number) =>
    apiClient.post(`/admin/students/${studentId}/move`, { cohortId }),

  // Mentors & assignment
  getRoster: (cohortId: number) =>
    apiClient.get<CohortRoster>(`/admin/cohorts/${cohortId}/roster`),
  addCohortMentor: (cohortId: number, mentorId: string) =>
    apiClient.post(`/admin/cohorts/${cohortId}/mentors`, { mentorId }),
  removeCohortMentor: (cohortId: number, mentorId: string) =>
    apiClient.delete(`/admin/cohorts/${cohortId}/mentors/${mentorId}`),
  assignStudentMentor: (cohortId: number, studentId: string, mentorId: string | null) =>
    apiClient.put(`/admin/cohorts/${cohortId}/students/${studentId}/mentor`, { mentorId }),
  autoAssignMentors: (cohortId: number, redistributeAll: boolean) =>
    apiClient.post<{ changed: number }>(`/admin/cohorts/${cohortId}/auto-assign-mentors`, { redistributeAll }),

  // Badges
  listBadges: () => apiClient.get<Badge[]>('/admin/badges'),
  createBadge: (data: BadgeInput) => apiClient.post<Badge>('/admin/badges', data),
  updateBadge: (id: number, data: BadgeInput) => apiClient.put<Badge>(`/admin/badges/${id}`, data),
  deleteBadge: (id: number) => apiClient.delete(`/admin/badges/${id}`),

  // Users
  listUsers: () => apiClient.get<UserSummary[]>('/admin/users'),
  getUser: (id: string) => apiClient.get<UserSummary>(`/admin/users/${id}`),
  inviteUser: (data: { firstName: string; lastName: string; email: string; role: string; timezone?: string }) =>
    apiClient.post('/admin/users/invite', data),
  changeRole: (id: string, role: string) =>
    apiClient.put(`/admin/users/${id}/role`, { role }),
  setUserStatus: (id: string, active: boolean) =>
    apiClient.put(`/admin/users/${id}/status`, { active }),
  adminResetPassword: (id: string, newPassword: string) =>
    apiClient.post(`/admin/users/${id}/reset-password`, { newPassword }),
}
