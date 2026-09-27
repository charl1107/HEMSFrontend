// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PublicEventListView from './PublicEventListView.vue'
import { listPublicEvents, type EventRecord } from '../../api/events.api'

vi.mock('../../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/events.api')>()
  return {
    ...actual,
    listPublicEvents: vi.fn(),
  }
})

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'e1',
    title: 'Spring Fair',
    description: null,
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

async function createTestRouter(): Promise<Router> {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        name: 'public-events',
        component: PublicEventListView,
      },
      {
        path: '/events/:id',
        name: 'public-event-detail',
        component: { template: '<div />' },
      },
    ],
  })
}

async function mountView(router: Router): Promise<VueWrapper> {
  await router.push({ name: 'public-events' })
  await router.isReady()
  const wrapper = mount(PublicEventListView, {
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('PublicEventListView', () => {
  let router: Router

  beforeEach(async () => {
    vi.clearAllMocks()
    router = await createTestRouter()
    vi.mocked(listPublicEvents).mockResolvedValue({
      items: [makeEvent({ id: 'e1', title: 'Spring Fair' })],
      total: 1,
    })
  })

  it('renders the first page of public events', async () => {
    const wrapper = await mountView(router)

    expect(wrapper.find('[data-testid="public-events-list"]').exists()).toBe(
      true,
    )
    expect(wrapper.text()).toContain('Spring Fair')
    expect(listPublicEvents).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 0 }),
    )
    expect(wrapper.find('[data-testid="load-more-public-events"]').exists()).toBe(
      false,
    )
  })

  it('appends the next page from the server', async () => {
    vi.mocked(listPublicEvents)
      .mockResolvedValueOnce({
        items: [makeEvent({ id: 'e1', title: 'Spring Fair' })],
        total: 2,
      })
      .mockResolvedValueOnce({
        items: [makeEvent({ id: 'e2', title: 'Second Event' })],
        total: 2,
      })
    const wrapper = await mountView(router)

    expect(wrapper.find('[data-testid="load-more-public-events"]').exists()).toBe(
      true,
    )
    await wrapper
      .find('[data-testid="load-more-public-events"]')
      .trigger('click')
    await flushPromises()

    expect(listPublicEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 1 }),
    )
    expect(wrapper.text()).toContain('Spring Fair')
    expect(wrapper.text()).toContain('Second Event')
  })

  it('keeps the Load more button hidden while total fits the page', async () => {
    const wrapper = await mountView(router)

    expect(wrapper.find('[data-testid="load-more-public-events"]').exists()).toBe(
      false,
    )
  })
})
