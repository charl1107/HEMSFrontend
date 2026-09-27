// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import StaffDashboardView from './StaffDashboardView.vue'
import { useAuthStore } from '../../stores/auth.store'

vi.mock('../../api/events.api', () => ({
  listEvents: vi.fn(),
  ATTENDANCE_SUPERVISOR_ROLES: ['Department Head', 'Event Coordinator', 'Instructor', 'Admin'],
}))

import { listEvents } from '../../api/events.api'

const routes = [
  { path: '/', component: { template: '<div />' } },
  { path: '/manage/events', name: 'events-list', component: { template: '<div />' } },
  { path: '/reports', name: 'reports-dashboard', component: { template: '<div />' } },
  { path: '/manage/events/:id/attendance', name: 'attendance-capture', component: { template: '<div />' } },
]

async function mountView() {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/')
  await router.isReady()
  return mount(StaffDashboardView, { global: { plugins: [router] } })
}

describe('StaffDashboardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(listEvents).mockReset()
    const auth = useAuthStore()
    auth.setSession('t', {
      id: '1',
      email: 'i@x.com',
      firstName: 'I',
      lastName: 'N',
      isActive: true,
      roles: ['Instructor'],
      mustChangePassword: false,
    })
  })

  it('shows empty state testid when no ongoing events', async () => {
    vi.mocked(listEvents).mockResolvedValue({ items: [], total: 0 })
    const wrapper = await mountView()
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="no-ongoing-events"]').exists()).toBe(true)
    })
    expect(wrapper.find('[data-testid="staff-dashboard"]').exists()).toBe(true)
    expect(wrapper.find('.dashboard__eyebrow').exists()).toBe(true)
    expect(listEvents).toHaveBeenCalledWith({ limit: 100 })
  })

  it('renders ongoing event row with start attendance testid', async () => {
    vi.mocked(listEvents).mockResolvedValue({
      items: [{ id: 'e1', title: 'Fair', status: 'Ongoing' } as never],
      total: 1,
    })
    const wrapper = await mountView()
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="start-attendance-e1"]').exists()).toBe(true)
    })
    expect(wrapper.find('[data-testid="ongoing-events"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-events"]').exists()).toBe(true)
  })

  it('offers no Add event shortcut even for submit roles', async () => {
    const auth = useAuthStore()
    auth.setSession('t', {
      id: '1',
      email: 'd@x.com',
      firstName: 'D',
      lastName: 'H',
      isActive: true,
      roles: ['Department Head'],
      mustChangePassword: false,
    })
    vi.mocked(listEvents).mockResolvedValue({ items: [], total: 0 })
    const wrapper = await mountView()
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="staff-dashboard"]').exists()).toBe(true)
    })
    expect(wrapper.text()).not.toContain('Add event')
  })
})
