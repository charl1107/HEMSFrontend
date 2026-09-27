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

  it('shows an error when login fails', async () => {
    vi.mocked(apiLogin).mockRejectedValue(new Error('Invalid credentials'))

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/login', name: 'login', component: LoginView }],
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
