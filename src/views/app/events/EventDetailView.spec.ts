// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EventDetailView from './EventDetailView.vue'
import { getEvent, type EventRecord } from '../../../api/events.api'
import {
  getApprovalHistory,
  submitForApproval,
  type ApprovalRecord,
} from '../../../api/approvals.api'
import { useAuthStore } from '../../../stores/auth.store'
import { listParticipants } from '../../../api/participants.api'
import { listCommittees, type CommitteeRecord } from '../../../api/committees.api'
import { listTasks } from '../../../api/tasks.api'
import { listSchedule } from '../../../api/schedule.api'
import { listDocuments } from '../../../api/documents.api'
import { tryListUsers } from '../../../api/users.api'

vi.mock('../../../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/events.api')>()
  return {
    ...actual,
    getEvent: vi.fn(),
  }
})

vi.mock('../../../api/participants.api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../api/participants.api')>()
  return {
    ...actual,
    listParticipants: vi.fn(),
    addParticipant: vi.fn(),
    removeParticipant: vi.fn(),
  }
})

vi.mock('../../../api/committees.api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../api/committees.api')>()
  return {
    ...actual,
    listCommittees: vi.fn(),
    createCommittee: vi.fn(),
    addCommitteeMember: vi.fn(),
    removeCommitteeMember: vi.fn(),
  }
})

vi.mock('../../../api/users.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/users.api')>()
  return {
    ...actual,
    tryListUsers: vi.fn(),
  }
})

vi.mock('../../../api/approvals.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/approvals.api')>()
  return {
    ...actual,
    getApprovalHistory: vi.fn(),
    submitForApproval: vi.fn(),
  }
})

vi.mock('../../../api/tasks.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/tasks.api')>()
  return {
    ...actual,
    listTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    removeTask: vi.fn(),
  }
})

vi.mock('../../../api/schedule.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/schedule.api')>()
  return {
    ...actual,
    listSchedule: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    removeSchedule: vi.fn(),
  }
})

vi.mock('../../../api/documents.api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../api/documents.api')>()
  return {
    ...actual,
    listDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    downloadDocument: vi.fn(),
    removeDocument: vi.fn(),
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
    eventType: { id: 't1', name: 'Workshop' },
    createdById: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeApproval(overrides: Partial<ApprovalRecord> = {}): ApprovalRecord {
  return {
    id: 'a1',
    eventId: 'e1',
    reviewerId: 'u1',
    action: 'Submitted',
    comments: 'Please review',
    createdAt: '2026-02-01T10:00:00.000Z',
    reviewer: { id: 'u1', firstName: 'Ada', lastName: 'Lovelace' },
    ...overrides,
  }
}

function makeCommittee(
  memberUserIds: string[],
  overrides: Partial<CommitteeRecord> = {},
): CommitteeRecord {
  return {
    id: 'c1',
    eventId: 'e1',
    name: 'Logistics',
    description: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    members: memberUserIds.map((userId, index) => ({
      id: `m${index + 1}`,
      committeeId: 'c1',
      userId,
      createdAt: '2026-01-02T00:00:00.000Z',
      user: {
        id: userId,
        firstName: 'Member',
        lastName: `${index + 1}`,
        email: `${userId}@x.com`,
      },
    })),
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
    global: { plugins: [router] },
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
    vi.mocked(getApprovalHistory).mockResolvedValue([makeApproval()])
    vi.mocked(listParticipants).mockResolvedValue([])
    vi.mocked(listCommittees).mockResolvedValue([])
    vi.mocked(listTasks).mockResolvedValue([])
    vi.mocked(listSchedule).mockResolvedValue([])
    vi.mocked(listDocuments).mockResolvedValue([])
    vi.mocked(tryListUsers).mockResolvedValue(null)
  })

  it('shows Submit for Approval for the owner on Draft', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Draft' }))

    const wrapper = await mountDetail(router)
    const submit = wrapper.find('[data-testid="submit-for-approval"]')
    expect(submit.exists()).toBe(true)
  })

  it('hides Submit for Approval when status is PendingApproval', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'PendingApproval' }))

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="submit-for-approval"]').exists()).toBe(false)
  })

  it('hides Submit for Approval for a non-owner without create roles', async () => {
    setSession(['Student'], 'other')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Draft', createdById: 'someone-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="submit-for-approval"]').exists()).toBe(false)
  })

  it('submits for approval and refreshes status and history', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Draft' }))
    vi.mocked(submitForApproval).mockResolvedValue(
      makeEvent({ status: 'PendingApproval' }),
    )

    const wrapper = await mountDetail(router)
    await wrapper.find('[data-testid="submit-for-approval"]').trigger('click')
    await flushPromises()

    expect(submitForApproval).toHaveBeenCalledWith('e1')
    expect(wrapper.find('[data-testid="event-detail-notice"]').text()).toContain(
      'Submitted for approval',
    )
    expect(getApprovalHistory).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('PendingApproval')
  })

  it('renders the approval history timeline', async () => {
    setSession(['Department Head'])
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'PendingApproval' }),
    )
    vi.mocked(getApprovalHistory).mockResolvedValue([
      makeApproval(),
      makeApproval({
        id: 'a2',
        action: 'RevisionRequested',
        comments: 'Add budget section',
        reviewer: { id: 'u9', firstName: 'Grace', lastName: 'Hopper' },
      }),
    ])

    const wrapper = await mountDetail(router)
    const items = wrapper.findAll('[data-testid="timeline-item"]')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('Submitted')
    expect(items[0].text()).toContain('Please review')
    expect(items[0].text()).toContain('Ada Lovelace')
    expect(items[1].text()).toContain('RevisionRequested')
    expect(items[1].text()).toContain('Add budget section')
  })

  it('gates roster sections behind approval status', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Draft' }))

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="participants-gated"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="committees-gated"]').exists()).toBe(true)
    expect(listParticipants).not.toHaveBeenCalled()
    expect(listCommittees).not.toHaveBeenCalled()
  })

  it('shows participant and committee entry sections on an approved event', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Approved', createdById: 'u1' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="participants-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="committees-section"]').exists()).toBe(true)
    expect(listParticipants).toHaveBeenCalledWith('e1')
    expect(listCommittees).toHaveBeenCalledWith('e1')
    expect(wrapper.find('[data-testid="participant-add-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="committee-create-form"]').exists()).toBe(true)
  })

  it('hides committee management for a non-owner without manager roles', async () => {
    setSession(['Event Coordinator'], 'someone-else')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Approved', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="committee-create-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="participant-add-form"]').exists()).toBe(true)
  })

  it('shows task and schedule sections on an approved event', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Approved', createdById: 'u1' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="tasks-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="documents-section"]').exists()).toBe(true)
    expect(listTasks).toHaveBeenCalledWith('e1')
    expect(listSchedule).toHaveBeenCalledWith('e1')
    expect(listDocuments).toHaveBeenCalledWith('e1')
    expect(wrapper.find('[data-testid="task-create-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="document-upload-form"]').exists()).toBe(
      true,
    )
  })

  it('gates tasks and schedule when the event is Cancelled', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Cancelled', createdById: 'u1' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="tasks-gated"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-gated"]').exists()).toBe(true)
    expect(listTasks).not.toHaveBeenCalled()
    expect(listSchedule).not.toHaveBeenCalled()
  })

  it('hides planning management for a viewer without planning rights', async () => {
    setSession(['Student'], 'someone-else')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="tasks-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="task-create-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="schedule-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="document-upload-form"]').exists()).toBe(
      false,
    )
    expect(listTasks).toHaveBeenCalledWith('e1')
    expect(listSchedule).toHaveBeenCalledWith('e1')
  })

  it('hides planning management for a non-owner Event Coordinator without membership', async () => {
    setSession(['Event Coordinator'], 'someone-else')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Approved', createdById: 'owner-else' }),
    )
    vi.mocked(listCommittees).mockResolvedValue([makeCommittee(['other-user'])])

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="task-create-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="schedule-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tasks-table"]').exists()).toBe(false)
    expect(listTasks).toHaveBeenCalledWith('e1')
  })

  it('shows planning management for a non-owner committee member', async () => {
    setSession(['Student'], 'member-1')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Approved', createdById: 'owner-else' }),
    )
    vi.mocked(listCommittees).mockResolvedValue([makeCommittee(['member-1'])])

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="task-create-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-form"]').exists()).toBe(true)
  })

  it('shows planning management for a non-owner Admin', async () => {
    setSession(['Admin'], 'admin-1')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Approved', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="task-create-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-form"]').exists()).toBe(true)
  })

  it('shows planning management for a non-owner Department Head', async () => {
    setSession(['Department Head'], 'head-1')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Approved', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="task-create-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-form"]').exists()).toBe(true)
  })
})
