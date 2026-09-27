// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AddStudentView from './AddStudentView.vue'
import { createUser, type CreateUserPayload } from '../../../api/users.api'
import type { SafeUser } from '../../../api/auth.types'

vi.mock('../../../api/users.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/users.api')>()
  return {
    ...actual,
    createUser: vi.fn(),
  }
})

function makeUser(): SafeUser {
  return {
    id: 'u9',
    email: 'sam@school.edu',
    firstName: 'Sam',
    lastName: 'Lee',
    isActive: true,
    roles: ['Student'],
    mustChangePassword: true,
    studentId: '2026-001',
    program: 'BSHM',
    yearLevel: 1,
  }
}

async function createTestRouter(): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/admin/students/new', name: 'admin-student-new', component: AddStudentView },
      { path: '/admin/users', name: 'admin-users', component: { template: '<div />' } },
    ],
  })
  await router.push('/admin/students/new')
  await router.isReady()
  return router
}

async function mountView(router: Router): Promise<VueWrapper> {
  return mount(AddStudentView, { global: { plugins: [router] } })
}

async function fillValid(wrapper: VueWrapper): Promise<void> {
  await wrapper.find('[data-testid="studentId"]').setValue('2026-001')
  await wrapper.find('[data-testid="firstName"]').setValue('Sam')
  await wrapper.find('[data-testid="lastName"]').setValue('Lee')
  await wrapper.find('[data-testid="email"]').setValue('sam@school.edu')
  await wrapper.find('[data-testid="program"]').setValue('BSHM')
  await wrapper.find('[data-testid="yearLevel"]').setValue('1')
  await wrapper.find('[data-testid="password"]').setValue('ChangeMe123!')
  await wrapper.find('[data-testid="confirmPassword"]').setValue('ChangeMe123!')
}

describe('AddStudentView', () => {
  let router: Router

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    router = await createTestRouter()
  })

  it('shows field errors when submitting an empty form', async () => {
    const wrapper = await mountView(router)

    await wrapper.find('[data-testid="add-student-form"]').trigger('submit')
    await flushPromises()

    expect(createUser).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="error-studentId"]').text()).toContain('required')
    expect(wrapper.find('[data-testid="error-firstName"]').text()).toContain('required')
    expect(wrapper.find('[data-testid="error-email"]').text()).toContain('required')
    expect(wrapper.find('[data-testid="error-password"]').text()).toContain('required')
    expect(router.currentRoute.value.name).toBe('admin-student-new')
  })

  it('creates the student and navigates to admin-users', async () => {
    vi.mocked(createUser).mockResolvedValue(makeUser())
    const wrapper = await mountView(router)

    await fillValid(wrapper)
    await wrapper.find('[data-testid="add-student-form"]').trigger('submit')
    await flushPromises()

    expect(createUser).toHaveBeenCalledTimes(1)
    const payload = vi.mocked(createUser).mock.calls[0][0] as CreateUserPayload
    expect(payload.roles).toEqual(['Student'])
    expect(payload.studentId).toBe('2026-001')
    expect(payload.yearLevel).toBe(1)
    expect(payload.isActive).toBe(true)
    expect(router.currentRoute.value.name).toBe('admin-users')
  })

  it('disables the submit button while saving', async () => {
    let release!: (user: SafeUser) => void
    vi.mocked(createUser).mockImplementation(
      () => new Promise<SafeUser>((resolve) => { release = resolve }),
    )
    const wrapper = await mountView(router)
    await fillValid(wrapper)

    const submit = wrapper.find<HTMLButtonElement>('[data-testid="create-student-submit"]')
    expect(submit.element.disabled).toBe(false)

    await wrapper.find('[data-testid="add-student-form"]').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(submit.element.disabled).toBe(true)

    release(makeUser())
    await flushPromises()
    expect(submit.element.disabled).toBe(false)
  })

  it('shows the API message on form error and stays on the page', async () => {
    vi.mocked(createUser).mockRejectedValue(new Error('Email already in use'))
    const wrapper = await mountView(router)

    await fillValid(wrapper)
    await wrapper.find('[data-testid="add-student-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="add-student-error"]').text()).toContain(
      'Email already in use',
    )
    expect(router.currentRoute.value.name).toBe('admin-student-new')
  })

  it('maps status Inactive to isActive false', async () => {
    vi.mocked(createUser).mockResolvedValue(makeUser())
    const wrapper = await mountView(router)

    await fillValid(wrapper)
    await wrapper.find('[data-testid="account-status"]').setValue('false')
    await wrapper.find('[data-testid="add-student-form"]').trigger('submit')
    await flushPromises()

    const payload = vi.mocked(createUser).mock.calls[0][0] as CreateUserPayload
    expect(payload.isActive).toBe(false)
  })
})
