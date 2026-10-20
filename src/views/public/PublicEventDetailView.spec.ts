// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PublicEventDetailView from './PublicEventDetailView.vue'
import { getPublicEvent, type EventRecord } from '../../api/events.api'

vi.mock('../../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/events.api')>()
  return {
    ...actual,
    getPublicEvent: vi.fn(),
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
    eventType: { id: 't1', name: 'Fair' },
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
  })

  it('renders the event with its description, venue and type', async () => {
    const wrapper = await mountView(router)

    expect(getPublicEvent).toHaveBeenCalledWith('e1')
    expect(wrapper.find('[data-testid="public-event-detail"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Spring Fair')
    expect(wrapper.text()).toContain('Campus fair')
    expect(wrapper.text()).toContain('Main Hall')
    expect(wrapper.text()).toContain('Fair')
    expect(wrapper.find('[data-testid="public-event-error"]').exists()).toBe(false)
  })

  it('shows the error state when the event fails to load', async () => {
    vi.mocked(getPublicEvent).mockRejectedValue(new Error('boom'))

    const wrapper = await mountView(router)

    expect(wrapper.find('[data-testid="public-event-error"]').text()).toContain('boom')
    expect(wrapper.text()).not.toContain('Spring Fair')
  })
})
