// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EventFormView from './EventFormView.vue'
import {
  createEvent,
  getEvent,
  updateEvent,
  uploadCover,
  type EventMutationResult,
  type EventRecord,
} from '../../../api/events.api'
import { submitForApproval } from '../../../api/approvals.api'

vi.mock('../../../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/events.api')>()
  return {
    ...actual,
    createEvent: vi.fn(),
    getEvent: vi.fn(),
    updateEvent: vi.fn(),
    uploadCover: vi.fn(),
    removeCover: vi.fn(),
  }
})

vi.mock('../../../api/approvals.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/approvals.api')>()
  return {
    ...actual,
    submitForApproval: vi.fn(),
  }
})

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: 'e1',
    title: 'Spring Fair',
    description: 'Campus fair',
    eventDate: '2026-05-01T00:00:00.000Z',
    venue: 'Main Hall',
    status: 'Draft',
    coverImageUrl: null,
    eventTypeId: null,
    eventType: null,
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeMutationResult(
  overrides: Partial<EventMutationResult> = {},
): EventMutationResult {
  return {
    ...makeEvent(overrides.id ? { id: overrides.id } : {}),
    conflictWarning: null,
    ...overrides,
  }
}

async function createTestRouter(): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'events-list', component: { template: '<div />' } },
      {
        path: '/approvals',
        name: 'approvals-queue',
        component: { template: '<div />' },
      },
      {
        path: '/manage/events/:id/edit',
        name: 'event-edit',
        component: EventFormView,
      },
    ],
  })
  return router
}

async function mountAt(
  router: Router,
  name: string,
  params: Record<string, string> = {},
  props: Record<string, unknown> = {},
): Promise<VueWrapper> {
  await router.push({ name, params })
  await router.isReady()
  return mount(EventFormView, {
    props,
    global: { plugins: [router] },
  })
}

async function mountOverlay(router: Router): Promise<VueWrapper> {
  return mountAt(router, 'approvals-queue', {}, { overlay: true })
}

async function fillValidForm(wrapper: VueWrapper): Promise<void> {
  await wrapper.find('[data-testid="event-title"]').setValue('Spring Fair')
  await wrapper.find('[data-testid="event-date"]').setValue('2026-05-01')
  await wrapper.find('[data-testid="event-venue"]').setValue('Main Hall')
}

describe('EventFormView', () => {
  let router: Router

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    router = await createTestRouter()
  })

  it('overlay auto-submits after create and emits submitted without navigating', async () => {
    vi.mocked(createEvent).mockResolvedValue(makeMutationResult({ id: 'new-1' }))
    vi.mocked(submitForApproval).mockResolvedValue(
      makeEvent({ id: 'new-1', status: 'PendingApproval' }),
    )

    const wrapper = await mountOverlay(router)
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createEvent).toHaveBeenCalledTimes(1)
    expect(submitForApproval).toHaveBeenCalledWith('new-1')
    expect(router.currentRoute.value.name).toBe('approvals-queue')
    const emitted = wrapper.emitted('submitted')
    expect(emitted).toHaveLength(1)
    expect(emitted![0][0]).toMatchObject({
      event: expect.objectContaining({ status: 'PendingApproval' }),
      conflictWarning: null,
      coverError: null,
    })
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('still auto-submits when create returns a conflictWarning and passes it through', async () => {
    vi.mocked(createEvent).mockResolvedValue(
      makeMutationResult({
        id: 'new-2',
        conflictWarning: 'Venue already has an event on this date',
      }),
    )
    vi.mocked(submitForApproval).mockResolvedValue(
      makeEvent({ id: 'new-2', status: 'PendingApproval' }),
    )

    const wrapper = await mountOverlay(router)
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(submitForApproval).toHaveBeenCalledWith('new-2')
    const emitted = wrapper.emitted('submitted')
    expect(emitted).toHaveLength(1)
    expect(emitted![0][0]).toMatchObject({
      conflictWarning: 'Venue already has an event on this date',
    })
  })

  it('reports cover upload errors without blocking submit', async () => {
    vi.mocked(createEvent).mockResolvedValue(makeMutationResult({ id: 'new-3' }))
    vi.mocked(uploadCover).mockRejectedValue(new Error('Cover upload failed'))
    vi.mocked(submitForApproval).mockResolvedValue(
      makeEvent({ id: 'new-3', status: 'PendingApproval' }),
    )

    const wrapper = await mountOverlay(router)
    await fillValidForm(wrapper)
    const input = wrapper.find<HTMLInputElement>('[data-testid="cover-input"]')
    const file = new File([new Uint8Array([1, 2, 3])], 'cover.png', {
      type: 'image/png',
    })
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(uploadCover).toHaveBeenCalledWith('new-3', file)
    expect(submitForApproval).toHaveBeenCalledWith('new-3')
    expect(wrapper.find('[data-testid="cover-error"]').text()).toContain(
      'Cover upload failed',
    )
    const emitted = wrapper.emitted('submitted')
    expect(emitted).toHaveLength(1)
    expect(emitted![0][0]).toMatchObject({ coverError: 'Cover upload failed' })
  })

  it('keeps the overlay open on submit failure and retries via updateEvent', async () => {
    vi.mocked(createEvent).mockResolvedValue(makeMutationResult({ id: 'new-4' }))
    vi.mocked(updateEvent).mockResolvedValue(makeMutationResult({ id: 'new-4' }))
    vi.mocked(submitForApproval)
      .mockRejectedValueOnce(new Error('Submit failed'))
      .mockResolvedValueOnce(
        makeEvent({ id: 'new-4', status: 'PendingApproval' }),
      )

    const wrapper = await mountOverlay(router)
    await fillValidForm(wrapper)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="event-form-error"]').text()).toContain(
      'Submit failed',
    )
    expect(wrapper.emitted('submitted')).toBeUndefined()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createEvent).toHaveBeenCalledTimes(1)
    expect(updateEvent).toHaveBeenCalledWith(
      'new-4',
      expect.objectContaining({ title: 'Spring Fair' }),
    )
    expect(submitForApproval).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('submitted')).toHaveLength(1)
  })

  it('cancel emits cancel from overlay mode', async () => {
    const wrapper = await mountOverlay(router)
    await wrapper.find('[data-testid="event-cancel"]').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('renders a disabled read-only form for non-editable status', async () => {
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({
        id: 'e9',
        title: 'Approved Fest',
        status: 'Approved',
      }),
    )

    const wrapper = await mountAt(router, 'event-edit', { id: 'e9' })
    await flushPromises()

    const notice = wrapper.find('[data-testid="event-readonly"]')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain('Approved')
    expect(notice.text()).toContain('not editable')

    const title = wrapper.find<HTMLInputElement>('[data-testid="event-title"]')
    const date = wrapper.find<HTMLInputElement>('[data-testid="event-date"]')
    const venue = wrapper.find<HTMLInputElement>('[data-testid="event-venue"]')
    const description = wrapper.find<HTMLTextAreaElement>(
      '[data-testid="event-description"]',
    )
    const submit = wrapper.find<HTMLButtonElement>('[data-testid="event-submit"]')
    const cover = wrapper.find<HTMLInputElement>('[data-testid="cover-input"]')

    expect(title.element.value).toBe('Approved Fest')
    expect(date.element.value).toBe('2026-05-01')
    expect(venue.element.value).toBe('Main Hall')
    expect(title.attributes('disabled')).toBeDefined()
    expect(date.attributes('disabled')).toBeDefined()
    expect(venue.attributes('disabled')).toBeDefined()
    expect(description.attributes('disabled')).toBeDefined()
    expect(cover.attributes('disabled')).toBeDefined()
    expect(submit.element.disabled).toBe(true)
  })

  it('leaves the form editable for Draft status', async () => {
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ id: 'e1', status: 'Draft' }),
    )

    const wrapper = await mountAt(router, 'event-edit', { id: 'e1' })
    await flushPromises()

    expect(wrapper.find('[data-testid="event-readonly"]').exists()).toBe(false)
    expect(
      wrapper.find<HTMLInputElement>('[data-testid="event-title"]').attributes(
        'disabled',
      ),
    ).toBeUndefined()
    expect(
      wrapper.find<HTMLButtonElement>('[data-testid="event-submit"]').element
        .disabled,
    ).toBe(false)
  })
})
