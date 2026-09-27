// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ApprovalQueueView from './ApprovalQueueView.vue'
import EventFormView from '../events/EventFormView.vue'
import { useAuthStore } from '../../../stores/auth.store'
import {
  approveEvent,
  listPendingApprovals,
  rejectEvent,
  requestRevision,
  type PendingApprovalRecord,
} from '../../../api/approvals.api'
import type { EventMutationResult } from '../../../api/events.api'

vi.mock('../../../api/approvals.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/approvals.api')>()
  return {
    ...actual,
    listPendingApprovals: vi.fn(),
    approveEvent: vi.fn(),
    rejectEvent: vi.fn(),
    requestRevision: vi.fn(),
  }
})

function makePending(overrides: Partial<PendingApprovalRecord> = {}): PendingApprovalRecord {
  return {
    id: 'p1',
    title: 'Spring Fair',
    description: null,
    eventDate: '2026-05-01T00:00:00.000Z',
    venue: 'Main Hall',
    status: 'PendingApproval',
    coverImageUrl: null,
    eventTypeId: null,
    eventType: { id: 't1', name: 'Workshop' },
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    approvals: [
      {
        id: 'a1',
        eventId: 'p1',
        reviewerId: 'u1',
        action: 'Submitted',
        comments: 'Ready for review',
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

function makeApproveResult(
  overrides: Partial<EventMutationResult> = {},
): EventMutationResult {
  return {
    ...makePending({ id: overrides.id ?? 'p1' }),
    conflictWarning: null,
    ...overrides,
  }
}

function conflictError(): Error {
  return Object.assign(new Error('Conflict'), {
    isAxiosError: true,
    response: {
      status: 409,
      data: {
        message: 'Venue conflict: "Other Fair" already uses this venue on 2026-05-01',
        conflict: {
          id: 'e9',
          title: 'Other Fair',
          venue: 'Main Hall',
          eventDate: '2026-05-01T00:00:00.000Z',
        },
        requiresOverride: true,
      },
    },
  })
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
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/approvals',
        name: 'approvals-queue',
        component: ApprovalQueueView,
      },
      {
        path: '/manage/events/:id',
        name: 'event-detail',
        component: { template: '<div />' },
      },
    ],
  })
}

async function mountQueue(router: Router): Promise<VueWrapper> {
  await router.push({ name: 'approvals-queue' })
  await router.isReady()
  const wrapper = mount(ApprovalQueueView, {
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('ApprovalQueueView', () => {
  let router: Router

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setRoles(['Department Head'])
    router = await createTestRouter()
    vi.mocked(listPendingApprovals).mockResolvedValue({
      items: [makePending()],
      total: 1,
    })
  })

  it('lists pending approvals with latest comment', async () => {
    const wrapper = await mountQueue(router)

    expect(wrapper.find('[data-testid="approvals-table"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Spring Fair')
    expect(wrapper.text()).toContain('Ready for review')
  })

  it('approves via the comment dialog', async () => {
    vi.mocked(approveEvent).mockResolvedValue(makeApproveResult())
    const wrapper = await mountQueue(router)

    await wrapper.find('[data-testid="approve-p1"]').trigger('click')
    await wrapper.find('[data-testid="approval-dialog-input"]').setValue('Looks good')
    await wrapper.find('[data-testid="approval-dialog-confirm"]').trigger('click')
    await flushPromises()

    expect(approveEvent).toHaveBeenCalledWith('p1', { comments: 'Looks good' })
    expect(wrapper.find('[data-testid="approval-dialog"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="approvals-notice"]').text()).toContain(
      'approved',
    )
    expect(listPendingApprovals).toHaveBeenCalledTimes(2)
  })

  it('opens the conflict override modal on 409 and overrides on second confirm', async () => {
    vi.mocked(approveEvent)
      .mockRejectedValueOnce(conflictError())
      .mockResolvedValueOnce(
        makeApproveResult({
          conflictWarning: 'Venue conflict: "Other Fair" already uses this venue',
        }),
      )
    const wrapper = await mountQueue(router)

    await wrapper.find('[data-testid="approve-p1"]').trigger('click')
    await wrapper.find('[data-testid="approval-dialog-confirm"]').trigger('click')
    await flushPromises()

    const modal = wrapper.find('[data-testid="conflict-override-modal"]')
    expect(modal.exists()).toBe(true)
    expect(wrapper.find('[data-testid="conflict-event-title"]').text()).toBe('Other Fair')
    expect(wrapper.find('[data-testid="conflict-venue"]').text()).toBe('Main Hall')
    expect(approveEvent).toHaveBeenCalledTimes(1)

    await wrapper.find('[data-testid="override-confirm"]').trigger('click')
    await flushPromises()

    expect(approveEvent).toHaveBeenLastCalledWith('p1', {
      overrideConflict: true,
    })
    expect(wrapper.find('[data-testid="conflict-override-modal"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="approvals-notice"]').text()).toContain(
      'override',
    )
  })

  it('cancel closes the override modal without approving', async () => {
    vi.mocked(approveEvent).mockRejectedValueOnce(conflictError())
    const wrapper = await mountQueue(router)

    await wrapper.find('[data-testid="approve-p1"]').trigger('click')
    await wrapper.find('[data-testid="approval-dialog-confirm"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="override-cancel"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="conflict-override-modal"]').exists()).toBe(false)
    expect(approveEvent).toHaveBeenCalledTimes(1)
    expect(listPendingApprovals).toHaveBeenCalledTimes(1)
  })

  it('requires a reason to reject', async () => {
    vi.mocked(rejectEvent).mockResolvedValue(makePending({ status: 'Rejected' }))
    const wrapper = await mountQueue(router)

    await wrapper.find('[data-testid="reject-p1"]').trigger('click')
    const confirm = wrapper.find<HTMLButtonElement>(
      '[data-testid="approval-dialog-confirm"]',
    )
    expect(confirm.element.disabled).toBe(true)

    await wrapper.find('[data-testid="approval-dialog-input"]').setValue('Missing budget')
    await confirm.trigger('click')
    await flushPromises()

    expect(rejectEvent).toHaveBeenCalledWith('p1', 'Missing budget')
    expect(wrapper.find('[data-testid="approvals-notice"]').text()).toContain('rejected')
  })

  it('requires comments to request revision', async () => {
    vi.mocked(requestRevision).mockResolvedValue(
      makePending({ status: 'RevisionRequired' }),
    )
    const wrapper = await mountQueue(router)

    await wrapper.find('[data-testid="revision-p1"]').trigger('click')
    const confirm = wrapper.find<HTMLButtonElement>(
      '[data-testid="approval-dialog-confirm"]',
    )
    expect(confirm.element.disabled).toBe(true)

    await wrapper
      .find('[data-testid="approval-dialog-input"]')
      .setValue('Add budget section')
    await confirm.trigger('click')
    await flushPromises()

    expect(requestRevision).toHaveBeenCalledWith('p1', 'Add budget section')
    expect(wrapper.find('[data-testid="approvals-notice"]').text()).toContain(
      'Revision requested',
    )
  })

  it('shows cover thumbnails when a cover exists', async () => {
    vi.mocked(listPendingApprovals).mockResolvedValue({
      items: [
        makePending({
          id: 'p1',
          coverImageUrl: '/uploads/covers/p1/cover.png',
        }),
        makePending({ id: 'p2', title: 'No Cover Fair', coverImageUrl: null }),
      ],
      total: 2,
    })
    const wrapper = await mountQueue(router)

    const thumb = wrapper.find('[data-testid="cover-thumb-p1"]')
    expect(thumb.exists()).toBe(true)
    expect(thumb.attributes('src')).toContain('/uploads/covers/p1/cover.png')
    expect(wrapper.find('[data-testid="cover-placeholder-p2"]').exists()).toBe(
      true,
    )
  })

  it('opens the create overlay and auto-submits into the queue', async () => {
    const wrapper = await mountQueue(router)

    await wrapper.find('[data-testid="create-event"]').trigger('click')
    expect(wrapper.find('[data-testid="create-event-dialog"]').exists()).toBe(
      true,
    )
    expect(wrapper.findComponent(EventFormView).exists()).toBe(true)

    const form = wrapper.findComponent(EventFormView)
    form.vm.$emit('submitted', {
      event: makePending({ id: 'p9', title: 'New Gala' }),
      conflictWarning: 'Venue conflict: Main Hall is busy',
      coverError: null,
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="create-event-dialog"]').exists()).toBe(
      false,
    )
    const notice = wrapper.find('[data-testid="approvals-notice"]')
    expect(notice.text()).toContain('Submitted for approval')
    expect(notice.text()).toContain('New Gala')
    expect(notice.text()).toContain('Venue conflict: Main Hall is busy')
    expect(listPendingApprovals).toHaveBeenCalledTimes(2)
  })

  it('cancels the create overlay without submitting', async () => {
    const wrapper = await mountQueue(router)

    await wrapper.find('[data-testid="create-event"]').trigger('click')
    await wrapper.find('[data-testid="event-cancel"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="create-event-dialog"]').exists()).toBe(
      false,
    )
    expect(listPendingApprovals).toHaveBeenCalledTimes(1)
  })

  it('lets submit-but-not-review roles create but not review', async () => {
    setRoles(['Student Officer'])
    const wrapper = await mountQueue(router)

    expect(wrapper.find('[data-testid="create-event"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="approve-p1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="reject-p1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="revision-p1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="view-approval-p1"]').exists()).toBe(true)
  })

  it('hides create and review actions from roles outside the submit set', async () => {
    setRoles(['Instructor'])
    const wrapper = await mountQueue(router)

    expect(wrapper.find('[data-testid="create-event"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="approve-p1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="view-approval-p1"]').exists()).toBe(true)
  })

  it('shows review actions to review roles', async () => {
    setRoles(['Event Coordinator'])
    const wrapper = await mountQueue(router)

    expect(wrapper.find('[data-testid="approve-p1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="reject-p1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="revision-p1"]').exists()).toBe(true)
  })

  it('loads more pending approvals when total exceeds the loaded items', async () => {
    vi.mocked(listPendingApprovals)
      .mockResolvedValueOnce({ items: [makePending({ id: 'p1' })], total: 2 })
      .mockResolvedValueOnce({
        items: [makePending({ id: 'p2', title: 'Second Fair' })],
        total: 2,
      })
    const wrapper = await mountQueue(router)

    expect(wrapper.find('[data-testid="load-more-approvals"]').exists()).toBe(
      true,
    )
    await wrapper.find('[data-testid="load-more-approvals"]').trigger('click')
    await flushPromises()

    expect(listPendingApprovals).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 1 }),
    )
    expect(wrapper.find('[data-testid="approve-p2"]').exists()).toBe(true)
  })

  it('hides Load more when the whole queue is loaded', async () => {
    const wrapper = await mountQueue(router)

    expect(wrapper.find('[data-testid="load-more-approvals"]').exists()).toBe(
      false,
    )
  })
})
