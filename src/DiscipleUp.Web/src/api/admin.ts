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

// ── Cohorts ───────────────────────────────────────────────────────────────────

export const adminApi = {
  // Cohorts
  listCohorts: () => apiClient.get<CohortSummary[]>('/admin/cohorts'),
  getCohort: (id: number) => apiClient.get<CohortDetail>(`/admin/cohorts/${id}`),
  createCohort: (data: { name: string; startDate: string; mentorId: string; lateEntryWindowDays: number; isPaid: boolean }) =>
    apiClient.post<{ id: number; name: string; status: string }>('/admin/cohorts', data),
  updateCohort: (id: number, data: Partial<{ name: string; startDate: string; mentorId: string; lateEntryWindowDays: number; isPaid: boolean }>) =>
    apiClient.put(`/admin/cohorts/${id}`, data),
  publishCohort: (id: number) =>
    apiClient.post(`/admin/cohorts/${id}/publish`, {}),

  // Weeks
  addWeek: (cohortId: number, data: { title: string; description?: string }) =>
    apiClient.post(`/admin/cohorts/${cohortId}/weeks`, data),
  updateWeek: (cohortId: number, weekId: number, data: { title?: string; description?: string }) =>
    apiClient.put(`/admin/cohorts/${cohortId}/weeks/${weekId}`, data),

  // Days
  addDay: (cohortId: number, weekId: number, data: { title: string; devotionText: string; scriptureReference?: string; scriptureText?: string }) =>
    apiClient.post(`/admin/cohorts/${cohortId}/weeks/${weekId}/days`, data),
  updateDay: (dayId: number, data: Partial<{ title: string; devotionText: string; scriptureReference: string; scriptureText: string }>) =>
    apiClient.put(`/admin/days/${dayId}`, data),

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

  // Users
  listUsers: () => apiClient.get<UserSummary[]>('/admin/users'),
  getUser: (id: string) => apiClient.get<UserSummary>(`/admin/users/${id}`),
  inviteUser: (data: { firstName: string; lastName: string; email: string; role: string; timezone?: string }) =>
    apiClient.post('/admin/users/invite', data),
  changeRole: (id: string, role: string) =>
    apiClient.put(`/admin/users/${id}/role`, { role }),
  adminResetPassword: (id: string, newPassword: string) =>
    apiClient.post(`/admin/users/${id}/reset-password`, { newPassword }),
}
