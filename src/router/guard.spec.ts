// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type RouteRecordRaw, type Router } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { me, refresh } from '../api/auth.api'
import { clearAccessToken } from '../api/http'
import StudentDashboardView from '../views/dashboards/StudentDashboardView.vue'
import { routes } from './routes'

vi.mock('../api/auth.api', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  refresh: vi.fn(),
}))

// guard.spec mounts the real StudentDashboardView, which now fetches the
// public upcoming-events feed on mount — keep it off the real network.
vi.mock('../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/events.api')>()
  return {
    ...actual,
    listPublicEvents: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  }
})

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
    vi.mocked(me).mockReset()
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

  it('denies Student on /reports, sets a denial flag, and the landing renders the notice', async () => {
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
    await router.push('/reports')
    await router.isReady()

    // Redirected to the role landing, and the guard recorded the refusal.
    expect(router.currentRoute.value.name).toBe('student-dashboard')
    expect(auth.deniedPath).toBe('/reports')

    // The landing itself renders the denial feedback.
    const wrapper = mount(StudentDashboardView, { global: { plugins: [router] } })
    await flushPromises()

    const notice = wrapper.find('[data-testid="access-denied"]')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain("You don't have access to that page.")
    wrapper.unmount()
  })

  it('denies Student on /manage/events and sets a denial flag', async () => {
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
    await router.push('/manage/events')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('student-dashboard')
    expect(router.currentRoute.value.path).not.toContain('/manage')
    expect(auth.deniedPath).toBe('/manage/events')
  })

  it('consumes the denial flag after the landing shows it (no stale re-show)', async () => {
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

    // Denied → redirected to the landing, flag set, landing renders it.
    await router.push('/reports')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('student-dashboard')
    expect(auth.deniedPath).toBe('/reports')
    const first = mount(StudentDashboardView, { global: { plugins: [router] } })
    await flushPromises()
    expect(first.find('[data-testid="access-denied"]').exists()).toBe(true)
    first.unmount()

    // One-shot: any later successful navigation consumes the flag…
    await router.push('/change-password')
    await router.isReady()
    expect(auth.deniedPath).toBeNull()

    // …so returning to the landing does NOT re-show the stale notice.
    await router.push('/student-dashboard')
    await router.isReady()
    const second = mount(StudentDashboardView, { global: { plugins: [router] } })
    await flushPromises()
    expect(second.find('[data-testid="access-denied"]').exists()).toBe(false)
    second.unmount()
  })

  it('clears a stale denial flag when a new session is set (login)', () => {
    const auth = useAuthStore()
    auth.deniedPath = '/reports'
    auth.setSession('token', {
      id: '1',
      email: 's@x.com',
      firstName: 'S',
      lastName: 'T',
      isActive: true,
      roles: ['Student'],
      mustChangePassword: false,
    })
    expect(auth.deniedPath).toBeNull()
  })

  it('clears a stale denial flag when fetchMe ends without a session', async () => {
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

    // Session loss via a failed /me: catch must drop the flag with the user.
    auth.deniedPath = '/reports'
    vi.mocked(me).mockRejectedValueOnce(new Error('boom'))
    await auth.fetchMe()
    expect(auth.user).toBeNull()
    expect(auth.deniedPath).toBeNull()

    // Already token-less: fetchMe's early return must not keep it either.
    auth.deniedPath = '/reports'
    await auth.fetchMe()
    expect(auth.deniedPath).toBeNull()
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
