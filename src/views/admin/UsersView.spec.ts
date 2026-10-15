// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import UsersView from './UsersView.vue'
import { assignRole, listUsers, removeRole } from '../../api/users.api'
import type { SafeUser } from '../../api/auth.types'

vi.mock('../../api/users.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/users.api')>()
  return {
    ...actual,
    listUsers: vi.fn(),
    assignRole: vi.fn(),
    removeRole: vi.fn(),
  }
})

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/admin/users', name: 'admin-users', component: UsersView },
      {
        path: '/admin/students/new',
        name: 'admin-student-new',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push('/admin/users')
  await router.isReady()
  const wrapper = mount(UsersView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('UsersView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listUsers).mockResolvedValue([])
  })

  function makeUser(overrides: Partial<SafeUser> = {}): SafeUser {
    return {
      id: 'u-2',
      email: 'target@hems.local',
      firstName: 'T',
      lastName: 'User',
      isActive: true,
      roles: ['Student'],
      mustChangePassword: false,
      ...overrides,
    }
  }

  it('shows an Add users button that opens the overlay titled Add user', async () => {
    const wrapper = await mountView()

    const button = wrapper.find('[data-testid="add-student-link"]')
    expect(button.exists()).toBe(true)
    expect(button.element.tagName).toBe('BUTTON')
    expect(button.text()).toContain('Add users')
    await button.trigger('click')
    expect(document.querySelector('[data-testid="add-student-form"]')).not.toBeNull()
    expect(
      document.querySelector('[data-testid="ui-modal"] .ui-modal-header h2')?.textContent,
    ).toBe('Add user')
  })

  it('keeps the admin-users container testid', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('[data-testid="admin-users"]').exists()).toBe(true)
  })

  it('opens the CSV student import modal', async () => {
    const wrapper = await mountView()
    await wrapper.find('[data-testid="open-bulk-import"]').trigger('click')
    expect(document.querySelector('[data-testid="bulk-import-students"]')).not.toBeNull()
  })

  it('shows the assigned role in the cell without a reload even when the assignRole response omits roles', async () => {
    vi.mocked(listUsers)
      .mockResolvedValueOnce([makeUser()])
      .mockResolvedValueOnce([makeUser({ roles: ['Student', 'Instructor'] })])
    // Deployed contract observed by QA (U8): response without the updated roles array.
    vi.mocked(assignRole).mockResolvedValue({ id: 'u-2' } as SafeUser)

    const wrapper = await mountView()

    await wrapper
      .find('[data-testid="assign-select-target@hems.local"]')
      .setValue('Instructor')
    await wrapper
      .find('[data-testid="assign-btn-target@hems.local"]')
      .trigger('click')
    await flushPromises()

    const cell = wrapper.find(
      '[data-testid="user-row-target@hems.local"] .users__roles-cell',
    )
    expect(cell.text()).toContain('Instructor')
  })

  it('re-fetches the user list after assignRole succeeds', async () => {
    vi.mocked(listUsers)
      .mockResolvedValueOnce([makeUser()])
      .mockResolvedValueOnce([makeUser({ roles: ['Student', 'Instructor'] })])
    vi.mocked(assignRole).mockResolvedValue(
      makeUser({ roles: ['Student', 'Instructor'] }),
    )

    const wrapper = await mountView()

    await wrapper
      .find('[data-testid="assign-select-target@hems.local"]')
      .setValue('Instructor')
    await wrapper
      .find('[data-testid="assign-btn-target@hems.local"]')
      .trigger('click')
    await flushPromises()

    expect(listUsers).toHaveBeenCalledTimes(2)
    expect(
      wrapper.find('[data-testid="user-row-target@hems.local"]').text(),
    ).toContain('Instructor')
  })

  it('re-fetches the user list after a role is removed', async () => {
    vi.mocked(listUsers)
      .mockResolvedValueOnce([makeUser({ roles: ['Student', 'Instructor'] })])
      .mockResolvedValueOnce([makeUser()])
    vi.mocked(removeRole).mockResolvedValue(makeUser())

    const wrapper = await mountView()

    await wrapper
      .find('[data-testid="remove-role-target@hems.local-Instructor"]')
      .trigger('click')
    await flushPromises()

    expect(listUsers).toHaveBeenCalledTimes(2)
    const cell = wrapper.find(
      '[data-testid="user-row-target@hems.local"] .users__roles-cell',
    )
    expect(cell.text()).not.toContain('Instructor')
  })
})
