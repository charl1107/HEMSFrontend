// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import EventDetailView from './EventDetailView.vue'
import { advanceEvent, getEvent, type EventRecord } from '../../../api/events.api'
import { useAuthStore } from '../../../stores/auth.store'
import { listCommittees, type CommitteeRecord } from '../../../api/committees.api'
import { listTasks } from '../../../api/tasks.api'
import { listSchedule } from '../../../api/schedule.api'
import {
  listDocuments,
  type DocumentRecord,
} from '../../../api/documents.api'
import { tryListUsers } from '../../../api/users.api'
import { expectSequentialHeadings } from '../../../test-utils/headings'

vi.mock('../../../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/events.api')>()
  return {
    ...actual,
    getEvent: vi.fn(),
    advanceEvent: vi.fn(),
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

function makeDocument(
  overrides: Partial<DocumentRecord> = {},
): DocumentRecord {
  return {
    id: 'd1',
    eventId: 'e1',
    uploadedById: 'u1',
    docType: 'Proposal',
    filePath: 'events/e1/proposal.pdf',
    originalFilename: 'proposal.pdf',
    mimeType: 'application/pdf',
    fileSize: 2048,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    uploadedBy: {
      id: 'u1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@x.com',
    },
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
    vi.mocked(listCommittees).mockResolvedValue([])
    vi.mocked(listTasks).mockResolvedValue([])
    vi.mocked(listSchedule).mockResolvedValue([])
    vi.mocked(listDocuments).mockResolvedValue([])
    vi.mocked(tryListUsers).mockResolvedValue(null)
  })

  it('gates roster sections on a Cancelled event', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Cancelled', createdById: 'u1' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="committees-gated"]').exists()).toBe(true)
    expect(listCommittees).not.toHaveBeenCalled()
  })

  it('shows the committee entry section on a Planning event', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'u1' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="committees-section"]').exists()).toBe(true)
    expect(listCommittees).toHaveBeenCalledWith('e1')
    expect(wrapper.find('[data-testid="committee-create-form"]').exists()).toBe(true)
  })

  it('hides committee management for a non-owner without manager roles', async () => {
    setSession(['Event Coordinator'], 'someone-else')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="committee-create-form"]').exists()).toBe(false)
  })

  it('shows task and schedule sections on a Planning event', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'u1' }),
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
      makeEvent({ status: 'Planning', createdById: 'owner-else' }),
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
      makeEvent({ status: 'Planning', createdById: 'owner-else' }),
    )
    vi.mocked(listCommittees).mockResolvedValue([makeCommittee(['member-1'])])

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="task-create-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-form"]').exists()).toBe(true)
  })

  it('shows planning management for a non-owner Admin', async () => {
    setSession(['Admin'], 'admin-1')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="task-create-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-form"]').exists()).toBe(true)
  })

  it('shows planning management for a non-owner Department Head', async () => {
    setSession(['Department Head'], 'head-1')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="task-create-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="schedule-form"]').exists()).toBe(true)
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

  it('hides Mark ongoing for a non-owner even while Planning', async () => {
    setSession(['Event Coordinator'], 'someone-else')
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'owner-else' }),
    )

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="mark-ongoing"]').exists()).toBe(false)
  })

  it('shows Mark completed for the owner while the event is Ongoing', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(makeEvent({ status: 'Ongoing' }))

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="mark-completed"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mark-ongoing"]').exists()).toBe(false)
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

  // Task 21 follow-up: promoting Card titles h3->h2 exposed the h4 group
  // titles inside CommitteesSection/DocumentsSection as an h2->h4 skip
  // (axe heading-order) whenever committee/document data renders.
  it('keeps the outline sequential when committee and document data render (axe heading-order)', async () => {
    setSession(['Event Coordinator'])
    vi.mocked(getEvent).mockResolvedValue(
      makeEvent({ status: 'Planning', createdById: 'u1' }),
    )
    vi.mocked(listCommittees).mockResolvedValue([makeCommittee(['u1'])])
    vi.mocked(listDocuments).mockResolvedValue([makeDocument()])

    const wrapper = await mountDetail(router)
    expect(wrapper.find('[data-testid="committee-c1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="documents-group-Proposal"]').exists()).toBe(
      true,
    )
    expectSequentialHeadings(wrapper)
  })
})
