// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CommitteesSection from './CommitteesSection.vue'
import {
  addCommitteeMember,
  createCommittee,
  listCommittees,
  removeCommitteeMember,
  type CommitteeRecord,
} from '../../../api/committees.api'
import { tryListUsers } from '../../../api/users.api'
import type { SafeUser } from '../../../api/auth.types'

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

function makeCommittee(overrides: Partial<CommitteeRecord> = {}): CommitteeRecord {
  return {
    id: 'c1',
    eventId: 'e1',
    name: 'Logistics',
    description: 'Handles venue setup',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    members: [
      {
        id: 'm1',
        committeeId: 'c1',
        userId: 'u5',
        createdAt: '2026-01-02T00:00:00.000Z',
        user: {
          id: 'u5',
          firstName: 'Mia',
          lastName: 'Chan',
          email: 'mia@x.com',
        },
      },
    ],
    ...overrides,
  }
}

function makeUser(overrides: Partial<SafeUser> = {}): SafeUser {
  return {
    id: 'u9',
    email: 'joy@x.com',
    firstName: 'Joy',
    lastName: 'Ada',
    isActive: true,
    roles: [],
    mustChangePassword: false,
    ...overrides,
  }
}

function mountSection(
  props: { status?: string; canManage?: boolean } = {},
): VueWrapper {
  return mount(CommitteesSection, {
    props: {
      eventId: 'e1',
      status: 'Approved',
      canManage: true,
      ...props,
    },
  })
}

describe('CommitteesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listCommittees).mockResolvedValue([])
    vi.mocked(tryListUsers).mockResolvedValue(null)
  })

  it('shows a status gate and skips loading before approval', async () => {
    const wrapper = mountSection({ status: 'PendingApproval' })
    await flushPromises()

    expect(wrapper.find('[data-testid="committees-gated"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="committees-gated"]').text()).toContain(
      'PendingApproval',
    )
    expect(wrapper.find('[data-testid="committee-create-form"]').exists()).toBe(false)
    expect(listCommittees).not.toHaveBeenCalled()
    expect(tryListUsers).not.toHaveBeenCalled()
  })

  it('creates a committee', async () => {
    vi.mocked(createCommittee).mockResolvedValue(
      makeCommittee({ members: [] }),
    )
    vi.mocked(listCommittees)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeCommittee({ members: [] })])

    const wrapper = mountSection()
    await flushPromises()

    const submit = wrapper.find<HTMLButtonElement>('[data-testid="committee-create"]')
    expect(submit.element.disabled).toBe(true)

    await wrapper.find('[data-testid="committee-name"]').setValue('Logistics')
    await wrapper
      .find('[data-testid="committee-description"]')
      .setValue('Handles venue setup')
    expect(submit.element.disabled).toBe(false)
    await wrapper.find('[data-testid="committee-create-form"]').trigger('submit')
    await flushPromises()

    expect(createCommittee).toHaveBeenCalledWith('e1', {
      name: 'Logistics',
      description: 'Handles venue setup',
    })
    expect(wrapper.find('[data-testid="committees-notice"]').text()).toContain(
      'Committee created',
    )
    expect(wrapper.find('[data-testid="committee-c1"]').exists()).toBe(true)
  })

  it('adds a member through the directory picker when available', async () => {
    vi.mocked(listCommittees).mockResolvedValue([makeCommittee({ members: [] })])
    vi.mocked(tryListUsers).mockResolvedValue([makeUser()])
    vi.mocked(addCommitteeMember).mockResolvedValue(makeCommittee())

    const wrapper = mountSection()
    await flushPromises()

    await wrapper.find('[data-testid="committee-member-select-c1"]').setValue('u9')
    await wrapper
      .find('[data-testid="committee-add-member-c1"]')
      .trigger('submit')
    await flushPromises()

    expect(addCommitteeMember).toHaveBeenCalledWith('e1', 'c1', 'u9')
    expect(wrapper.find('[data-testid="committees-notice"]').text()).toContain(
      'Member added',
    )
  })

  it('adds a member through a free-form user ID when the directory is unavailable', async () => {
    vi.mocked(listCommittees).mockResolvedValue([makeCommittee({ members: [] })])
    vi.mocked(tryListUsers).mockResolvedValue(null)
    vi.mocked(addCommitteeMember).mockResolvedValue(makeCommittee())

    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="committee-member-input-c1"]').exists()).toBe(true)
    await wrapper.find('[data-testid="committee-member-input-c1"]').setValue('u7')
    await wrapper
      .find('[data-testid="committee-add-member-c1"]')
      .trigger('submit')
    await flushPromises()

    expect(addCommitteeMember).toHaveBeenCalledWith('e1', 'c1', 'u7')
  })

  it('removes a member and refreshes', async () => {
    vi.mocked(listCommittees)
      .mockResolvedValueOnce([makeCommittee()])
      .mockResolvedValueOnce([makeCommittee({ members: [] })])
    vi.mocked(removeCommitteeMember).mockResolvedValue()

    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="member-m1"]').exists()).toBe(true)
    await wrapper.find('[data-testid="member-remove-c1-u5"]').trigger('click')
    await flushPromises()

    expect(removeCommitteeMember).toHaveBeenCalledWith('e1', 'c1', 'u5')
    expect(wrapper.find('[data-testid="committees-notice"]').text()).toContain(
      'removed',
    )
    expect(wrapper.find('[data-testid="committee-members-empty"]').exists()).toBe(true)
  })

  it('hides management controls for viewers without manage rights', async () => {
    vi.mocked(listCommittees).mockResolvedValue([makeCommittee()])

    const wrapper = mountSection({ canManage: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="committee-create-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="committee-add-member-c1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="member-remove-c1-u5"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="member-m1"]').exists()).toBe(true)
    expect(tryListUsers).not.toHaveBeenCalled()
  })
})
