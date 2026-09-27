import { http, authHttp } from './http'
import type { LoginResponse, SafeUser } from './auth.types'

export type { LoginResponse, SafeUser }

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await authHttp.post<LoginResponse>('/auth/login', { email, password })
  return data
}

export async function refresh(): Promise<LoginResponse> {
  const { data } = await authHttp.post<LoginResponse>('/auth/refresh')
  return data
}

export async function logout(): Promise<void> {
  await authHttp.post('/auth/logout')
}

export async function me(): Promise<SafeUser> {
  const { data } = await http.get<SafeUser>('/auth/me')
  return data
}

export async function changePassword(
  currentPassword: string | undefined,
  newPassword: string,
): Promise<SafeUser> {
  const { data } = await http.post<SafeUser>('/auth/change-password', {
    ...(currentPassword ? { currentPassword } : {}),
    newPassword,
  })
  return data
}
