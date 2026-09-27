// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import UsersView from './UsersView.vue'
import { listUsers } from '../../api/users.api'

vi.mock('../../api/users.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/users.api')>()
  return { ...actual, listUsers: vi.fn() }
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

  it('shows Add Student link for navigation', async () => {
    const wrapper = await mountView()

    const link = wrapper.find('a[href="/admin/students/new"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('data-testid')).toBe('add-student-link')
    expect(link.text()).toContain('Add Student')
  })

  it('keeps the admin-users container testid', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('[data-testid="admin-users"]').exists()).toBe(true)
  })
})
