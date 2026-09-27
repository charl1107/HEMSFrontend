import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw, type Router } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { refresh } from '../api/auth.api'
import { clearAccessToken } from '../api/http'
import { routes } from './routes'

vi.mock('../api/auth.api', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  refresh: vi.fn(),
}))

const stub = { template: '<div />' }

function withStubs(records: RouteRecordRaw[]): RouteRecordRaw[] {
  return records.map((r) => {
    const { components: _components, component: _component, ...rest } = r
    const next = { ...rest, component: stub } as RouteRecordRaw
    if ('children' in r && r.children) {
      ;(next as { children?: RouteRecordRaw[] }).children = withStubs(r.children)
    }
    return next
  })
}

async function createTestRouter(): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: withStubs(routes),
  })
  const { installAuthGuard } = await import('./guard')
  installAuthGuard(router)
  return router
}

describe('router guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAccessToken()
    vi.mocked(refresh).mockReset()
  })

  it('denies Student on /admin/users and redirects to student-dashboard', async () => {
    const auth = useAuthStore()
    auth.setSession('token', {
      id: '1',
      email: 's@x.com',
      firstName: 'S',
      lastName: 'T',
      isActive: true,
      roles: ['Student'],
      mustChangePassword: false,
    })
    const router = await createTestRouter()
    await router.push('/admin/users')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('student-dashboard')
    expect(router.currentRoute.value.path).not.toContain('/admin')
  })

  it('no longer registers the admin dashboard route', () => {
    const collectNames = (records: RouteRecordRaw[]): string[] =>
      records.flatMap((record) => [
        ...(typeof record.name === 'string' ? [record.name] : []),
        ...('children' in record && record.children
          ? collectNames(record.children)
          : []),
      ])
    expect(collectNames(routes)).not.toContain('admin-dashboard')
  })

  it('denies Student on /admin/students/new', async () => {
    const auth = useAuthStore()
    auth.setSession('token', {
      id: '1',
      email: 's@x.com',
      firstName: 'S',
      lastName: 'T',
      isActive: true,
      roles: ['Student'],
      mustChangePassword: false,
    })
    const router = await createTestRouter()
    await router.push('/admin/students/new')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('student-dashboard')
  })

  it('allows Admin on /admin/users', async () => {
    const auth = useAuthStore()
    auth.setSession('token', {
      id: '2',
      email: 'a@x.com',
      firstName: 'A',
      lastName: 'B',
      isActive: true,
      roles: ['Admin'],
      mustChangePassword: false,
    })
    const router = await createTestRouter()
    await router.push('/admin/users')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('admin-users')
  })

  it('redirects unauthenticated user on protected route to login', async () => {
    const router = await createTestRouter()
    await router.push('/admin/users')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('keeps public routes open without auth', async () => {
    const router = await createTestRouter()
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('redirects user with mustChangePassword to change-password', async () => {
    const auth = useAuthStore()
    auth.setSession('token', {
      id: '1',
      email: 's@x.com',
      firstName: 'S',
      lastName: 'T',
      isActive: true,
      roles: ['Student'],
      mustChangePassword: true,
    })
    const router = await createTestRouter()
    await router.push('/student-dashboard')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('change-password')
  })

  it('allows user with mustChangePassword to stay on change-password', async () => {
    const auth = useAuthStore()
    auth.setSession('token', {
      id: '1',
      email: 's@x.com',
      firstName: 'S',
      lastName: 'T',
      isActive: true,
      roles: ['Student'],
      mustChangePassword: true,
    })
    const router = await createTestRouter()
    await router.push('/change-password')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('change-password')
  })

  it('does not redirect when mustChangePassword is false', async () => {
    const auth = useAuthStore()
    auth.setSession('token', {
      id: '1',
      email: 's@x.com',
      firstName: 'S',
      lastName: 'T',
      isActive: true,
      roles: ['Student'],
      mustChangePassword: false,
    })
    const router = await createTestRouter()
    await router.push('/student-dashboard')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('student-dashboard')
  })

  it('waits for delayed session restore before redirecting a protected route', async () => {
    let releaseRestore!: () => void
    const restoreGate = new Promise<void>((resolve) => {
      releaseRestore = resolve
    })
    vi.mocked(refresh).mockImplementation(async () => {
      await restoreGate
      return {
        accessToken: 'restored-token',
        user: {
          id: '9',
          email: 'a@x.com',
          firstName: 'A',
          lastName: 'B',
          isActive: true,
          roles: ['Admin'],
          mustChangePassword: false,
        },
      }
    })

    const router = await createTestRouter()
    const navigation = router.push('/admin/users')

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(router.currentRoute.value.name).not.toBe('login')
    expect(router.currentRoute.value.name).not.toBe('admin-users')

    releaseRestore()
    await navigation

    expect(router.currentRoute.value.name).toBe('admin-users')
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
