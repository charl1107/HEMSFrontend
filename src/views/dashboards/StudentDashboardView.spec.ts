// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import StudentDashboardView from './StudentDashboardView.vue'
import { useAuthStore } from '../../stores/auth.store'

vi.mock('../../api/events.api', () => ({
  listPublicEvents: vi.fn(),
  EVENT_READ_ROLES: ['Department Head', 'Event Coordinator', 'Instructor', 'Student Officer', 'Admin'],
}))

import { listPublicEvents } from '../../api/events.api'

function makePublicEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    title: 'Spring Fair',
    description: null,
    eventDate: '2099-05-01T00:00:00.000Z',
    venue: 'Main Hall',
    status: 'Planning',
    coverImageUrl: null,
    eventTypeId: null,
    eventType: null,
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/events', name: 'public-events', component: { template: '<div />' } },
      {
        path: '/events/:id',
        name: 'public-event-detail',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push('/')
  await router.isReady()
  return mount(StudentDashboardView, { global: { plugins: [router] } })
}

describe('StudentDashboardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(listPublicEvents).mockReset()
    const auth = useAuthStore()
    auth.setSession('t', {
      id: '1',
      email: 's@x.com',
      firstName: 'S',
      lastName: 'T',
      isActive: true,
      roles: ['Student'],
      mustChangePassword: false,
    })
  })

  it('shows the browse-events quick action', async () => {
    vi.mocked(listPublicEvents).mockResolvedValue({ items: [], total: 0 })
    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.find('[data-testid="student-dashboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="browse-events"]').exists()).toBe(true)
    expect(wrapper.find('.dashboard__eyebrow').text()).toBe('Student')
  })

  it('lists upcoming public events with links to the public detail page', async () => {
    vi.mocked(listPublicEvents).mockResolvedValue({
      items: [
        makePublicEvent({ id: 'e1', title: 'Spring Fair' }),
        makePublicEvent({ id: 'e2', title: 'Career Day', venue: 'Gym' }),
      ],
      total: 2,
    })
    const wrapper = await mountView()
    await flushPromises()

    expect(listPublicEvents).toHaveBeenCalledWith({ limit: 25 })
    const list = wrapper.find('[data-testid="upcoming-events"]')
    expect(list.exists()).toBe(true)
    expect(wrapper.find('[data-testid="upcoming-event-e1"]').text()).toContain('Spring Fair')
    expect(wrapper.find('[data-testid="upcoming-event-e2"]').text()).toContain('Career Day')
  })

  it('shows the empty state when no upcoming events remain', async () => {
    vi.mocked(listPublicEvents).mockResolvedValue({
      items: [makePublicEvent({ eventDate: '2020-05-01T00:00:00.000Z' })],
      total: 1,
    })
    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.find('[data-testid="no-upcoming-events"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="upcoming-events"]').exists()).toBe(false)
  })

  it('surfaces a load error without breaking the quick actions', async () => {
    vi.mocked(listPublicEvents).mockRejectedValue(new Error('Public feed down'))
    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.find('[data-testid="events-error"]').text()).toContain('Public feed down')
    expect(wrapper.find('[data-testid="browse-events"]').exists()).toBe(true)
  })
})
