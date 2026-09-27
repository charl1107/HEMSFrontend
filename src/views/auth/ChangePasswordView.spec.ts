// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChangePasswordView from './ChangePasswordView.vue'
import { changePassword } from '../../api/auth.api'

vi.mock('../../api/auth.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/auth.api')>()
  return {
    ...actual,
    changePassword: vi.fn(),
    me: vi.fn(),
  }
})

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/change-password', name: 'change-password', component: ChangePasswordView },
      { path: '/student-dashboard', name: 'student-dashboard', component: { template: '<div />' } },
    ],
  })
  await router.push('/change-password')
  await router.isReady()
  const wrapper = mount(ChangePasswordView, {
    global: { plugins: [router] },
  })
  return { wrapper, router }
}

describe('ChangePasswordView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows field errors on mismatch', async () => {
    const { wrapper } = await mountView()

    await wrapper.find('[data-testid="current-password"]').setValue('OldPass123')
    await wrapper.find('[data-testid="new-password"]').setValue('NewPass123')
    await wrapper.find('[data-testid="confirm-password"]').setValue('Different1')
    await wrapper.find('[data-testid="change-password-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Passwords do not match.')
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('calls changePassword with values when valid', async () => {
    vi.mocked(changePassword).mockResolvedValue({
      id: 'u1',
      email: 's@x.com',
      firstName: 'S',
      lastName: 'T',
      isActive: true,
      roles: ['Student'],
      mustChangePassword: false,
    })
    const { wrapper } = await mountView()

    await wrapper.find('[data-testid="current-password"]').setValue('OldPass123')
    await wrapper.find('[data-testid="new-password"]').setValue('NewPass123')
    await wrapper.find('[data-testid="confirm-password"]').setValue('NewPass123')
    await wrapper.find('[data-testid="change-password-submit"]').trigger('click')
    await flushPromises()

    expect(changePassword).toHaveBeenCalledWith('OldPass123', 'NewPass123')
  })

  it('navigates after success', async () => {
    vi.mocked(changePassword).mockResolvedValue({
      id: 'u1',
      email: 's@x.com',
      firstName: 'S',
      lastName: 'T',
      isActive: true,
      roles: ['Student'],
      mustChangePassword: false,
    })
    const { wrapper, router } = await mountView()

    await wrapper.find('[data-testid="current-password"]').setValue('OldPass123')
    await wrapper.find('[data-testid="new-password"]').setValue('NewPass123')
    await wrapper.find('[data-testid="confirm-password"]').setValue('NewPass123')
    await wrapper.find('[data-testid="change-password-submit"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('student-dashboard')
  })

  it('maps API 401 to current password incorrect', async () => {
    const err = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: { status: 401 },
    })
    vi.mocked(changePassword).mockRejectedValue(err)
    const { wrapper } = await mountView()

    await wrapper.find('[data-testid="current-password"]').setValue('WrongPass')
    await wrapper.find('[data-testid="new-password"]').setValue('NewPass123')
    await wrapper.find('[data-testid="confirm-password"]').setValue('NewPass123')
    await wrapper.find('[data-testid="change-password-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="change-password-error"]').text()).toContain(
      'Current password is incorrect.',
    )
  })
})
