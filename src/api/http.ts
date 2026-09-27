import axios, {
  AxiosError,
  isAxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ref } from 'vue'
import type { SafeUser } from './auth.types'

const accessToken = ref<string | null>(null)
let unauthorizedHandler: (() => void) | null = null
let refreshPromise: Promise<string> | null = null

export function setAccessToken(token: string | null): void {
  accessToken.value = token
}

export function getAccessToken(): string | null {
  return accessToken.value
}

export function clearAccessToken(): void {
  accessToken.value = null
}

export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const body = error.response?.data as { message?: unknown } | undefined
    const message = body?.message
    if (typeof message === 'string' && message.trim()) return message.trim()
    if (Array.isArray(message)) {
      const joined = message
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .join(' ')
      if (joined) return joined
    }
    if (error.message) return error.message
    return fallback
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
})

export const authHttp = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
})

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

http.interceptors.request.use((config) => {
  if (accessToken.value) {
    config.headers.Authorization = `Bearer ${accessToken.value}`
  }
  return config
})

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = authHttp
      .post<{ accessToken: string; user: SafeUser }>('/auth/refresh')
      .then(({ data }) => {
        accessToken.value = data.accessToken
        return data.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined
    const is401 = error.response?.status === 401
    const hadAuth = Boolean(config?.headers?.Authorization)

    if (!is401 || !config || !hadAuth || config._retry) {
      return Promise.reject(error)
    }

    try {
      const token = await refreshAccessToken()
      config._retry = true
      config.headers.Authorization = `Bearer ${token}`
      return http.request(config)
    } catch {
      unauthorizedHandler?.()
      return Promise.reject(error)
    }
  },
)
