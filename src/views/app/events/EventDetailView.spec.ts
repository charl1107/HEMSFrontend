// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EventDetailView from './EventDetailView.vue'
import { advanceEvent, getEvent, updateEvent, type EventRecord } from '../../../api/events.api'
import { useAuthStore } from '../../../stores/auth.store'
import { expectSequentialHeadings } from '../../../test-utils/headings'

vi.mock('../../../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/events.api')>()
  return {
    ...actual,
    getEvent: vi.fn(),
    advanceEvent: vi.fn(),
    updateEvent: vi.fn(),
  }
})

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'e1',
    title: 'Spring Fair',
    description: 'Campus fair',
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

function setSession(roles: string[], id = 'u1'): void {
  const auth = useAuthStore()
  auth.setSession('token', {
    id,
    email: 'u@x.com',
    firstName: 'U',
    lastName: 'Ser',
    isActive: true,
    roles,
    mustChangePassword: false,
  })
}

async function createTestRouter(): Promise<Router> {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/manage/events/:id',
        name: 'event-detail',
        component: EventDetailView,
      },
      {
        path: '/manage/events',
        name: 'events-list',
        component: { template: '<div />' },
      },
      {
        path: '/manage/events/:id/edit',
        name: 'event-edit',
        component: { template: '<div />' },
      },
    ],
  })
}

async function mountDetail(router: Router): Promise<VueWrapper> {
  await router.push({ name: 'event-detail', params: { id: 'e1' } })
  await router.isReady()
  const wrapper = mount(EventDetailView, {
    // The edit modal teleports to body; the stub keeps it inside the wrapper.
    global: { plugins: [router], stubs: { teleport: true } },
  })
  await flushPromises()
  return wrapper
}

describe('EventDetailView', () => {
  let router: Router

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    router = await createTestRouter()
  })

  it('renders no task, schedule, committee or document sections', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Planning' }))

    const wrapper = await mountDetail(router)
    for (const testid of [
      'tasks-section',
      'schedule-section',
      'committees-section',
      'documents-section',
      'task-create-form',
      'schedule-form',
      'committee-create-form',
      'document-upload-form',
    ]) {
      expect(wrapper.find(`[data-testid="${testid}"]`).exists()).toBe(false)
    }
  })

  it('opens the edit modal with the event fields for a non-owner Admin', async () => {
    setSession(['Admin'], 'admin-1')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="edit-event"]').exists()).toBe(true)

    await wrapper.find('[data-testid="edit-event"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="event-form"]').exists()).toBe(true)
    expect(
      wrapper.find<HTMLInputElement>('[data-testid="event-title"]').element.value,
    ).toBe('Spring Fair')
  })

  it('hides Edit event for a non-owner without manager roles', async () => {
    setSession(['Event Coordinator'], 'someone-else')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="edit-event"]').exists()).toBe(false)
  })

  it('shows Edit event for a non-owner Department Head', async () => {
    setSession(['Department Head'], 'head-1')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="edit-event"]').exists()).toBe(true)
  })

  it('hides Edit event when the event is frozen at Completed', async () => {
    setSession(['Admin'], 'admin-1')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Completed', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="edit-event"]').exists()).toBe(false)
  })

  it('saves field changes from the edit modal via updateEvent and closes it', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Planning' }))
    vi.mocked(updateEvent).mockResolvedValue({
      ...makeEvent({ title: 'Renamed Fair' }),
      conflictWarning: null,
    })

    const wrapper = await mountDetail(router)
    await wrapper.find('[data-testid="edit-event"]').trigger('click')
    await flushPromises()

    await wrapper
      .find<HTMLInputElement>('[data-testid="event-title"]')
      .setValue('Renamed Fair')
    await wrapper.find('[data-testid="event-form-fields"]').trigger('submit')
    await flushPromises()

    expect(updateEvent).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ title: 'Renamed Fair' }),
    )
    expect(wrapper.find('[data-testid="event-detail-notice"]').text()).toContain(
      'Event updated.',
    )
    expect(wrapper.find('[data-testid="event-form"]').exists()).toBe(false)
  })

  it('shows Mark ongoing for the owner on a Planning event', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Planning' }))

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="mark-ongoing"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mark-completed"]').exists()).toBe(false)
  })

  it('hides Mark ongoing when the event is Completed', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Completed' }))

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="mark-ongoing"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mark-completed"]').exists()).toBe(false)
  })

  it('hides lifecycle buttons for a non-owner even while Planning', async () => {
    setSession(['Event Coordinator'], 'someone-else')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="mark-ongoing"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cancel-event"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="resume-event"]').exists()).toBe(false)
  })

  it('shows Mark completed for the owner while the event is Ongoing', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Ongoing' }))

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="mark-completed"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mark-ongoing"]').exists()).toBe(false)
  })

  it('offers Cancel event to the owner on a Planning event', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Planning' }))

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="cancel-event"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="resume-event"]').exists()).toBe(false)
  })

  it('offers Resume event to the owner on a Cancelled event', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Cancelled' }))

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="resume-event"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cancel-event"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mark-ongoing"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mark-completed"]').exists()).toBe(false)
  })

  it('cancels through the confirm dialog via advanceEvent with Cancelled in the copy', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Planning' }))
    vi.mocked(advanceEvent).mockResolvedValue(makeEvent({ status: 'Cancelled' }))

    const wrapper = await mountDetail(router)
    await wrapper.find('[data-testid="cancel-event"]').trigger('click')
    await flushPromises()

    const dialog = wrapper.find('[data-testid="confirm-dialog"]')
    expect(dialog.exists()).toBe(true)
    expect(dialog.text()).toContain('Cancelled')
    expect(advanceEvent).not.toHaveBeenCalled()

    await wrapper.find('[data-testid="confirm-dialog-confirm"]').trigger('click')
    await flushPromises()

    expect(advanceEvent).toHaveBeenCalledWith('e1', 'Cancelled')
    expect(wrapper.find('[data-testid="event-detail-notice"]').text()).toContain(
      'Event cancelled.',
    )
  })

  it('resumes a Cancelled event through the confirm dialog via advanceEvent', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Cancelled' }))
    vi.mocked(advanceEvent).mockResolvedValue(makeEvent({ status: 'Planning' }))

    const wrapper = await mountDetail(router)
    await wrapper.find('[data-testid="resume-event"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="confirm-dialog"]').text()).toContain('Planning')
    await wrapper.find('[data-testid="confirm-dialog-confirm"]').trigger('click')
    await flushPromises()

    expect(advanceEvent).toHaveBeenCalledWith('e1', 'Planning')
    expect(wrapper.find('[data-testid="event-detail-notice"]').text()).toContain(
      'Event resumed.',
    )
  })

  it('offers lifecycle buttons to a non-owner Admin (EVENT_EDIT_ROLES)', async () => {
    setSession(['Admin'], 'admin-1')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Ongoing', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="mark-completed"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cancel-event"]').exists()).toBe(true)
  })

  it('advances Planning→Ongoing through the confirm dialog via advanceEvent', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Planning' }))
    vi.mocked(advanceEvent).mockResolvedValue(makeEvent({ status: 'Ongoing' }))

    const wrapper = await mountDetail(router)
    await wrapper.find('[data-testid="mark-ongoing"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="confirm-dialog"]').exists()).toBe(true)
    expect(advanceEvent).not.toHaveBeenCalled()

    await wrapper.find('[data-testid="confirm-dialog-confirm"]').trigger('click')
    await flushPromises()

    expect(advanceEvent).toHaveBeenCalledWith('e1', 'Ongoing')
    expect(wrapper.find('[data-testid="mark-ongoing"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="event-detail-notice"]').text()).toContain(
      'ongoing',
    )
  })

  it('keeps the heading outline sequential (axe heading-order)', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'u1' }),
    )

    const wrapper = await mountDetail(router)
    expectSequentialHeadings(wrapper)
  })
})
