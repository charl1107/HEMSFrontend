import { http, authHttp, getStoredRefreshToken } from './http'
import type { LoginResponse, SafeUser } from './auth.types'

export type { LoginResponse, SafeUser }

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await authHttp.post<LoginResponse>('/auth/login', { email, password })
  return data
}

export async function refresh(token?: string): Promise<LoginResponse> {
  const refreshToken = token || getStoredRefreshToken()
  const { data } = await authHttp.post<LoginResponse>(
    '/auth/refresh',
    refreshToken ? { refreshToken } : {},
  )
  return data
}

export async function logout(): Promise<void> {
  const refreshToken = getStoredRefreshToken()
  await authHttp.post('/auth/logout', refreshToken ? { refreshToken } : {})
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
