import { apiClient } from './client'

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  userId: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
}

export interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  password: string
  dateOfBirth: string
  timezone: string
  parentEmail?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', payload),

  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', payload),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (email: string, token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { email, token, newPassword }),

  completeConsent: (token: string, firstName: string, lastName: string, password: string) =>
    apiClient.post('/auth/consent/complete', { token, firstName, lastName, password }),
}
