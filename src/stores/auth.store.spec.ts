// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useAuthStore } from './auth.store'
import { clearAccessToken, getAccessToken, setAccessToken } from '../api/http'

const adminUser = {
  id: 'u1',
  email: 'admin@hems.local',
  firstName: 'Ada',
  lastName: 'Admin',
  isActive: true,
  roles: ['Admin'],
  mustChangePassword: false,
}

describe('auth store isAuthenticated', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAccessToken()
  })

  it('flips true after setSession even if isAuthenticated was read while signed out', async () => {
    const auth = useAuthStore()

    expect(auth.isAuthenticated).toBe(false)

    auth.setSession('tok', adminUser)
    await nextTick()

    expect(getAccessToken()).toBe('tok')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('flips true when the access token is set after the user', async () => {
    const auth = useAuthStore()
    auth.setSession(null as unknown as string, adminUser)
    expect(auth.isAuthenticated).toBe(false)

    setAccessToken('late-token')
    await nextTick()

    expect(auth.isAuthenticated).toBe(true)
  })

  it('flips false when the token is cleared', async () => {
    const auth = useAuthStore()
    auth.setSession('tok', adminUser)
    expect(auth.isAuthenticated).toBe(true)

    clearAccessToken()
    await nextTick()

    expect(auth.isAuthenticated).toBe(false)
  })
})
