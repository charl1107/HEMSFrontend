// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppLayout from './AppLayout.vue'
import { useAuthStore } from '../stores/auth.store'

vi.mock('../components/NotificationBell.vue', () => ({
  default: { template: '<div data-testid="bell-stub" />' },
}))

const stub = { template: '<div />' }

async function createTestRouter(): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: AppLayout,
        children: [
          { path: 'dashboard', name: 'dashboard', component: stub },
          { path: 'manage/events', name: 'events-list', component: stub },
          { path: 'approvals', name: 'approvals-queue', component: stub },
          { path: 'reports', name: 'reports-dashboard', component: stub },
          { path: 'admin/users', name: 'admin-users', component: stub },
          { path: 'admin/audit', name: 'admin-audit', component: stub },
        ],
      },
    ],
  })
  await router.push('/dashboard')
  await router.isReady()
  return router
}

async function mountLayout(router: Router): Promise<VueWrapper> {
  const wrapper = mount({ template: '<RouterView />' }, {
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('AppLayout theme toggle', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false } as MediaQueryList),
    )
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.setSession('token', {
      id: 'u1',
      email: 'admin@hems.local',
      firstName: 'Ada',
      lastName: 'Admin',
      isActive: true,
      roles: ['Admin'],
      mustChangePassword: false,
    })
  })

  it('renders the dark mode toggle in the light state', async () => {
    const wrapper = await mountLayout(await createTestRouter())

    const toggle = wrapper.find('[data-testid="theme-toggle"]')
    expect(toggle.exists()).toBe(true)
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(toggle.text()).toContain('Dark mode')
    expect(wrapper.find('.app-layout').classes()).not.toContain('dark')
  })

  it('toggles the dark class on the app shell and persists the choice', async () => {
    const wrapper = await mountLayout(await createTestRouter())
    const toggle = wrapper.find('[data-testid="theme-toggle"]')

    await toggle.trigger('click')

    expect(wrapper.find('.app-layout').classes()).toContain('dark')
    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(localStorage.getItem('hems-theme')).toBe('dark')

    await toggle.trigger('click')

    expect(wrapper.find('.app-layout').classes()).not.toContain('dark')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(localStorage.getItem('hems-theme')).toBe('light')
  })

  it('applies a stored dark preference on first render', async () => {
    localStorage.setItem('hems-theme', 'dark')
    const wrapper = await mountLayout(await createTestRouter())

    expect(wrapper.find('.app-layout').classes()).toContain('dark')
    expect(
      wrapper.find('[data-testid="theme-toggle"]').attributes('aria-pressed'),
    ).toBe('true')
  })
})
