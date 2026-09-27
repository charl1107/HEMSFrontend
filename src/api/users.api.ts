import { http } from './http'
import type { SafeUser } from './auth.types'

export const ROLE_NAMES = [
  'Admin',
  'Department Head',
  'Event Coordinator',
  'Instructor',
  'Student Officer',
  'Student',
] as const

export async function listUsers(): Promise<SafeUser[]> {
  const { data } = await http.get<SafeUser[]>('/users')
  return data
}

export async function tryListUsers(): Promise<SafeUser[] | null> {
  try {
    return await listUsers()
  } catch {
    return null
  }
}

export async function assignRole(userId: string, role: string): Promise<SafeUser> {
  const { data } = await http.post<SafeUser>(`/users/${userId}/roles`, { role })
  return data
}

export async function removeRole(userId: string, roleId: string): Promise<SafeUser> {
  const { data } = await http.delete<SafeUser>(`/users/${userId}/roles/${roleId}`)
  return data
}

export interface CreateUserPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  isActive: boolean
  roles: string[]
  studentId?: string
  program?: string
  yearLevel?: number
}

export async function createUser(payload: CreateUserPayload): Promise<SafeUser> {
  const { data } = await http.post<SafeUser>('/users', payload)
  return data
}
