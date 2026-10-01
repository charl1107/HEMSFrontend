// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PublicEventDetailView from './PublicEventDetailView.vue'
import { getPublicEvent, type EventRecord } from '../../api/events.api'
import { getPublicSchedule } from '../../api/public-events.api'
import { listSchedule, type ScheduleRecord } from '../../api/schedule.api'

vi.mock('../../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/events.api')>()
  return {
    ...actual,
    getPublicEvent: vi.fn(),
  }
})

vi.mock('../../api/public-events.api', () => ({
  getPublicSchedule: vi.fn(),
}))

// The public page used to read the schedule through this authenticated call,
// which 401s for anonymous visitors and produced a false empty state. Keep it
// mocked so the spec can pin that it is no longer used here.
vi.mock('../../api/schedule.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/schedule.api')>()
  return {
    ...actual,
    listSchedule: vi.fn(),
  }
})

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'e1',
    title: 'Spring Fair',
    description: 'Campus fair',
    eventDate: '2026-05-01T00:00:00.000Z',
    venue: 'Main Hall',
    status: 'Approved',
    coverImageUrl: null,
    eventTypeId: null,
    eventType: { id: 't1', name: 'Fair' },
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeSchedule(overrides: Partial<ScheduleRecord> = {}): ScheduleRecord {
  return {
    id: 's1',
    eventId: 'e1',
    activityName: 'Opening ceremony',
    startTime: '2026-05-01T09:00:00.000Z',
    endTime: '2026-05-01T10:00:00.000Z',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides,
  }
}

async function createTestRouter(): Promise<Router> {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/events/:id',
        name: 'public-event-detail',
        component: PublicEventDetailView,
      },
      {
        path: '/',
        name: 'public-events',
        component: { template: '<div />' },
      },
    ],
  })
}

async function mountView(router: Router): Promise<VueWrapper> {
  await router.push({ name: 'public-event-detail', params: { id: 'e1' } })
  await router.isReady()
  const wrapper = mount(PublicEventDetailView, {
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('PublicEventDetailView', () => {
  let router: Router

  beforeEach(async () => {
    vi.clearAllMocks()
    router = await createTestRouter()
    vi.mocked(getPublicEvent).mockResolvedValue(makeEvent())
    vi.mocked(getPublicSchedule).mockResolvedValue([makeSchedule()])
  })

  it('loads the schedule from the public endpoint and renders the entries', async () => {
    const wrapper = await mountView(router)

    expect(getPublicSchedule).toHaveBeenCalledTimes(1)
    expect(getPublicSchedule).toHaveBeenCalledWith('e1')
    // The authenticated call is what 401'd for anonymous visitors.
    expect(listSchedule).not.toHaveBeenCalled()

    const section = wrapper.find('.public-event-detail__schedule')
    expect(section.exists()).toBe(true)
    expect(section.text()).toContain('Opening ceremony')
    expect(section.text()).not.toContain(
      'No schedule has been published for this event yet.',
    )
  })

  it('keeps the empty-state message for a genuinely empty schedule', async () => {
    vi.mocked(getPublicSchedule).mockResolvedValue([])

    const wrapper = await mountView(router)

    expect(
      wrapper.find('.public-event-detail__schedule-empty').text(),
    ).toBe('No schedule has been published for this event yet.')
  })

  it('still renders the event when the schedule fetch fails', async () => {
    vi.mocked(getPublicSchedule).mockRejectedValue(new Error('boom'))

    const wrapper = await mountView(router)

    expect(wrapper.find('[data-testid="public-event-error"]').exists()).toBe(
      false,
    )
    expect(wrapper.text()).toContain('Spring Fair')
    expect(
      wrapper.find('.public-event-detail__schedule-empty').exists(),
    ).toBe(true)
  })
})
