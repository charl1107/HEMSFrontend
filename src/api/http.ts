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

const REFRESH_TOKEN_KEY = 'hems_refresh_token'

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredRefreshToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  } catch {
    // Ignore localStorage write failures (e.g. storage disabled / quota)
  }
}

export function setAccessToken(token: string | null): void {
  accessToken.value = token
}

export function getAccessToken(): string | null {
  return accessToken.value
}

export function clearAccessToken(): void {
  accessToken.value = null
  setStoredRefreshToken(null)
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
  // Render free-tier cold-starts can take 30-60 seconds; a 15 s timeout
  // causes the refresh to fail silently and forces a re-login.
  timeout: 90_000,
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
    refreshPromise = (async () => {
      // Retry once — the first attempt may time out while Render
      // cold-starts the backend; the second hits a warm server.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const storedToken = getStoredRefreshToken()
          const { data } = await authHttp.post<{
            accessToken: string
            refreshToken?: string
            user: SafeUser
          }>('/auth/refresh', storedToken ? { refreshToken: storedToken } : {})
          accessToken.value = data.accessToken
          if (data.refreshToken) {
            setStoredRefreshToken(data.refreshToken)
          }
          return data.accessToken
        } catch (err) {
          if (attempt === 0 && isAxiosError(err) && (!err.response || err.code === 'ECONNABORTED')) {
            // Network error or timeout — Render is likely cold-starting. Retry.
            continue
          }
          throw err
        }
      }
      throw new Error('Refresh failed after retries')
    })().finally(() => {
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
