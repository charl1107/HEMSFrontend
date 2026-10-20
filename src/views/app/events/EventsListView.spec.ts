// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EventsListView from './EventsListView.vue'
import { useAuthStore } from '../../../stores/auth.store'
import { expectSequentialHeadings } from '../../../test-utils/headings'
import { listEvents, createEvent, type EventRecord } from '../../../api/events.api'

vi.mock('../../../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/events.api')>()
  return {
    ...actual,
    listEvents: vi.fn(),
    createEvent: vi.fn(),
  }
})

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'e1',
    title: 'Spring Fair',
    description: null,
    eventDate: '2026-05-01T00:00:00.000Z',
    venue: 'Main Hall',
    status: 'Planning',
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
    // The create modal teleports to body; the stub keeps it inside the wrapper.
    global: { plugins: [router], stubs: { teleport: true } },
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
        makeEvent({ id: 'e1', status: 'Planning' }),
        makeEvent({ id: 'e2', status: 'Ongoing' }),
      ],
      total: 2,
    })
    router = await createTestRouter()
  })

  it('offers New event to Department Heads with no per-row edit/delete', async () => {
    setRoles(['Department Head'])
    const wrapper = await mountList(router)

    expect(wrapper.find('[data-testid="events-table"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-event-e1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="new-event-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="edit-event-e1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="delete-event-e1"]').exists()).toBe(false)
  })

  it('renders a New event button for a user holding Event Coordinator', async () => {
    setRoles(['Event Coordinator'])
    const wrapper = await mountList(router)

    expect(wrapper.find('[data-testid="new-event-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="view-event-e2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="edit-event-e1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="delete-event-e1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-event-e2"]').exists()).toBe(false)
  })

  it('does not render New event for a Student', async () => {
    setRoles(['Student'])
    const wrapper = await mountList(router)

    expect(wrapper.find('[data-testid="new-event-button"]').exists()).toBe(false)
  })

  it('offers exactly All plus the four statuses in the status filter', async () => {
    setRoles(['Department Head'])
    const wrapper = await mountList(router)

    const options = wrapper.findAll('[data-testid="status-filter"] option')
    expect(options.map((option) => option.text())).toEqual([
      'All statuses',
      'Planning',
      'Ongoing',
      'Completed',
      'Cancelled',
    ])
  })

  it('opens the create modal and navigates to the new event detail on success', async () => {
    setRoles(['Event Coordinator'])
    vi.mocked(createEvent).mockResolvedValue({
      ...makeEvent({ id: 'new-1', title: 'New Fair', status: 'Planning' }),
      conflictWarning: null,
    })
    const wrapper = await mountList(router)

    await wrapper.find('[data-testid="new-event-button"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="event-title"]').setValue('New Fair')
    await wrapper.find('[data-testid="event-date"]').setValue('2026-06-01')
    await wrapper.find('[data-testid="event-venue"]').setValue('Gym')
    await wrapper.find('[data-testid="event-form-fields"]').trigger('submit')
    await flushPromises()

    expect(createEvent).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.name).toBe('event-detail')
    expect(router.currentRoute.value.params.id).toBe('new-1')
  })

  it('refetches from the server when the status filter changes', async () => {
    setRoles(['Department Head'])
    const wrapper = await mountList(router)
    vi.mocked(listEvents).mockClear()

    await wrapper.find('[data-testid="status-filter"]').setValue('Planning')
    await flushPromises()

    expect(listEvents).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Planning', offset: 0 }),
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
        items: [makeEvent({ id: 'e1', status: 'Planning' })],
        total: 2,
      })
      .mockResolvedValueOnce({
        items: [makeEvent({ id: 'e2', status: 'Ongoing' })],
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

  it('shows "No events yet." when no filters are set and the result is empty', async () => {
    setRoles(['Department Head'])
    vi.mocked(listEvents).mockResolvedValue({ items: [], total: 0 })
    const wrapper = await mountList(router)

    const empty = wrapper.find('[data-testid="events-empty"]')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('No events yet.')
    expect(empty.text()).not.toContain('No events match the current filters.')
  })

  it('keeps the filtered empty-state copy when a filter is active', async () => {
    setRoles(['Department Head'])
    vi.mocked(listEvents).mockResolvedValue({ items: [], total: 0 })
    const wrapper = await mountList(router)

    await wrapper.find('[data-testid="status-filter"]').setValue('Planning')
    await flushPromises()

    const empty = wrapper.find('[data-testid="events-empty"]')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('No events match the current filters.')
  })

  it('renders headings in sequential order with events on screen (axe heading-order)', async () => {
    setRoles(['Department Head'])
    const wrapper = await mountList(router)

    expect(wrapper.find('[data-testid="events-table"]').exists()).toBe(true)
    expectSequentialHeadings(wrapper)
  })
})
