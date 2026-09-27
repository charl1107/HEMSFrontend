export interface SafeUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  roles: string[]
  mustChangePassword: boolean
  studentId?: string | null
  program?: string | null
  yearLevel?: number | null
}

export interface LoginResponse {
  accessToken: string
  user: SafeUser
}
