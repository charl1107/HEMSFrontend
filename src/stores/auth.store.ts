import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { SafeUser } from '../api/auth.types'
import { login as apiLogin, logout as apiLogout, me as apiMe, refresh as apiRefresh } from '../api/auth.api'
import { setAccessToken, clearAccessToken, getAccessToken, onUnauthorized, setStoredRefreshToken } from '../api/http'
import { landingRoute } from '../router/landing-route'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SafeUser | null>(null)
  const ready = ref(false)
  let restorePromise: Promise<void> | null = null

  const roles = computed(() => user.value?.roles ?? [])
  const isAuthenticated = computed(() => Boolean(user.value && getAccessToken()))

  function setSession(token: string, nextUser: SafeUser, refreshToken?: string): void {
    setAccessToken(token)
    if (refreshToken) {
      setStoredRefreshToken(refreshToken)
    }
    user.value = nextUser
    ready.value = true
  }

  async function login(email: string, password: string): Promise<RouteLocationRaw> {
    const { accessToken, refreshToken, user: nextUser } = await apiLogin(email, password)
    setSession(accessToken, nextUser, refreshToken)
    if (nextUser.mustChangePassword) {
      return { name: 'change-password' }
    }
    return landingRoute(nextUser.roles)
  }

  async function logout(): Promise<void> {
    try {
      await apiLogout()
    } finally {
      clearAccessToken()
      user.value = null
    }
  }

  async function fetchMe(): Promise<void> {
    if (!getAccessToken()) {
      user.value = null
      return
    }
    try {
      user.value = await apiMe()
    } catch {
      clearAccessToken()
      user.value = null
    }
  }

  async function restoreSession(): Promise<void> {
    if (!getAccessToken()) {
      // No in-memory token; try the refresh cookie.
      // Retry once because Render free-tier may be cold-starting (30-60 s).
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const { accessToken, refreshToken: nextRefreshToken, user: nextUser } = await apiRefresh()
          setSession(accessToken, nextUser, nextRefreshToken)
          break
        } catch {
          if (attempt === 0) {
            // First failure — wait briefly then retry in case of cold-start.
            await new Promise((r) => setTimeout(r, 2_000))
            continue
          }
          // Second failure — genuinely no valid session.
        }
      }
    } else {
      await fetchMe()
    }
    ready.value = true
  }

  function ensureRestored(): Promise<void> {
    if (ready.value) {
      return Promise.resolve()
    }
    if (!restorePromise) {
      restorePromise = restoreSession()
    }
    return restorePromise
  }

  function handleUnauthorized(): void {
    clearAccessToken()
    user.value = null
  }

  onUnauthorized(handleUnauthorized)

  return {
    user,
    roles,
    isAuthenticated,
    ready,
    setSession,
    login,
    logout,
    fetchMe,
    restoreSession,
    ensureRestored,
  }
})
