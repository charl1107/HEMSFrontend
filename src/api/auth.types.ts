export interface SafeUser {
  id: string
  email: string
  firstName: string
  middleName?: string | null
  lastName: string
  suffix?: string | null
  isActive: boolean
  roles: string[]
  mustChangePassword: boolean
  studentId?: string | null
  program?: string | null
  yearLevel?: number | null
}

export interface LoginResponse {
  accessToken: string
  refreshToken?: string
  user: SafeUser
}
