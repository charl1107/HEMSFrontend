// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginView from './LoginView.vue'
import { login as apiLogin } from '../../api/auth.api'

vi.mock('../../api/auth.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/auth.api')>()
  return {
    ...actual,
    login: vi.fn(),
  }
})

describe('LoginView', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('calls auth.login when Sign in is clicked', async () => {
    vi.mocked(apiLogin).mockResolvedValue({
      accessToken: 'tok',
      user: {
        id: 'u1',
        email: 'admin@hems.local',
        firstName: 'Ada',
        lastName: 'Admin',
        isActive: true,
        roles: ['Admin'],
        mustChangePassword: false,
      },
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', name: 'login', component: LoginView },
        { path: '/dashboard', name: 'dashboard', component: { template: '<div />' } },
        // LoginView renders a brand CTA linking to the 'sign-in' route
        // (registered in routes.ts) — the test router must resolve it too.
        { path: '/sign-in', name: 'sign-in', component: LoginView },
      ],
    })
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: { plugins: [router] },
    })

    await wrapper.find('[data-testid="login-email"]').setValue('admin@hems.local')
    await wrapper.find('[data-testid="login-password"]').setValue('ChangeMe123!')
    await wrapper.find('[data-testid="login-submit"]').trigger('click')
    await flushPromises()

    expect(apiLogin).toHaveBeenCalledWith('admin@hems.local', 'ChangeMe123!')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('renders a top-level <h1> for the sign-in form (axe page-has-heading-one)', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', name: 'login', component: LoginView },
        { path: '/sign-in', name: 'sign-in', component: LoginView },
      ],
    })
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    const headings = wrapper.findAll('h1')
    expect(headings.length).toBeGreaterThan(0)
    expect(headings.some((h) => h.text().includes('Sign in'))).toBe(true)
  })

  // On `/login` (the landing route) below 900px the form panel is
  // display:none, so the brand panel is the whole visible page — axe found no
  // h1 at all there (TESTING.md §8.6). The brand panel needs its own h1.
  it('renders an <h1> in the brand landing panel (axe page-has-heading-one)', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', name: 'login', component: LoginView },
        { path: '/sign-in', name: 'sign-in', component: LoginView },
      ],
    })
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    const brandH1 = wrapper.find('.login__brand h1')
    expect(brandH1.exists()).toBe(true)
    expect(brandH1.text()).toContain('Hospitality Management')
  })

  it('shows an error when login fails', async () => {
    vi.mocked(apiLogin).mockRejectedValue(new Error('Invalid credentials'))

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', name: 'login', component: LoginView },
        { path: '/sign-in', name: 'sign-in', component: LoginView },
      ],
    })
    await router.push('/login')
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: { plugins: [router] },
    })

    await wrapper.find('[data-testid="login-email"]').setValue('a@b.com')
    await wrapper.find('[data-testid="login-password"]').setValue('wrong')
    await wrapper.find('[data-testid="login-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="login-error"]').text()).toContain(
      'Invalid credentials',
    )
  })
})
