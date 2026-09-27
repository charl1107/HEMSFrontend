// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EventsListView from './EventsListView.vue'
import { useAuthStore } from '../../../stores/auth.store'
import { listEvents, type EventRecord } from '../../../api/events.api'

vi.mock('../../../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/events.api')>()
  return {
    ...actual,
    listEvents: vi.fn(),
  }
})

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'e1',
    title: 'Spring Fair',
    description: null,
    eventDate: '2026-05-01T00:00:00.000Z',
    venue: 'Main Hall',
    status: 'Draft',
    coverImageUrl: null,
    eventTypeId: null,
    eventType: { id: 't1', name: 'Workshop' },
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function setRoles(roles: string[]): void {
  const auth = useAuthStore()
  auth.setSession('token', {
    id: 'u1',
    email: 'u@x.com',
    firstName: 'U',
    lastName: 'Ser',
    isActive: true,
    roles,
    mustChangePassword: false,
  })
}

async function createTestRouter(): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/manage/events',
        name: 'events-list',
        component: EventsListView,
      },
      {
        path: '/manage/events/:id/edit',
        name: 'event-edit',
        component: { template: '<div />' },
      },
      {
        path: '/manage/events/:id',
        name: 'event-detail',
        component: { template: '<div />' },
      },
    ],
  })
  return router
}

async function mountList(router: Router): Promise<VueWrapper> {
  await router.push({ name: 'events-list' })
  await router.isReady()
  const wrapper = mount(EventsListView, {
    global: {
      plugins: [router],
    },
  })
  await flushPromises()
  return wrapper
}

describe('EventsListView', () => {
  let router: Router

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(listEvents).mockResolvedValue({
      items: [
        makeEvent({ id: 'e1', status: 'Draft' }),
        makeEvent({ id: 'e2', status: 'Approved' }),
      ],
      total: 2,
    })
    router = await createTestRouter()
  })

  it('is browse-only for Department Heads', async () => {
    setRoles(['Department Head'])
    const wrapper = await mountList(router)

    expect(wrapper.find('[data-testid="events-table"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-event-e1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="create-event-link"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-event-e1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="delete-event-e1"]').exists()).toBe(false)
  })

  it('hides create/edit/delete for other submit roles too', async () => {
    setRoles(['Event Coordinator'])
    const wrapper = await mountList(router)

    expect(wrapper.find('[data-testid="view-event-e2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="create-event-link"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-event-e1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="delete-event-e1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-event-e2"]').exists()).toBe(false)
  })

  it('refetches from the server when the status filter changes', async () => {
    setRoles(['Department Head'])
    const wrapper = await mountList(router)
    vi.mocked(listEvents).mockClear()

    await wrapper.find('[data-testid="status-filter"]').setValue('Approved')
    await flushPromises()

    expect(listEvents).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Approved', offset: 0 }),
    )
  })

  it('refetches from the server when the campus filter changes', async () => {
    setRoles(['Department Head'])
    const wrapper = await mountList(router)
    vi.mocked(listEvents).mockClear()

    await wrapper.find('[data-testid="campus-filter"]').setValue('OffCampus')
    await flushPromises()

    expect(listEvents).toHaveBeenCalledWith(
      expect.objectContaining({ campusScope: 'OffCampus', offset: 0 }),
    )
  })

  it('shows Load more while total exceeds the loaded items and appends', async () => {
    setRoles(['Department Head'])
    vi.mocked(listEvents)
      .mockResolvedValueOnce({
        items: [makeEvent({ id: 'e1', status: 'Draft' })],
        total: 2,
      })
      .mockResolvedValueOnce({
        items: [makeEvent({ id: 'e2', status: 'Approved' })],
        total: 2,
      })
    const wrapper = await mountList(router)

    expect(wrapper.find('[data-testid="load-more-events"]').exists()).toBe(true)
    await wrapper.find('[data-testid="load-more-events"]').trigger('click')
    await flushPromises()

    expect(listEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 1 }),
    )
    expect(wrapper.find('[data-testid="view-event-e2"]').exists()).toBe(true)
  })

  it('hides Load more when everything is loaded', async () => {
    setRoles(['Department Head'])
    const wrapper = await mountList(router)

    expect(wrapper.find('[data-testid="load-more-events"]').exists()).toBe(false)
  })
})
