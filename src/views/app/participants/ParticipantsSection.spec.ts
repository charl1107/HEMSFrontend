// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ParticipantsSection from './ParticipantsSection.vue'
import {
  addParticipant,
  listParticipants,
  removeParticipant,
  type ParticipantRecord,
} from '../../../api/participants.api'
import { tryListUsers } from '../../../api/users.api'
import type { SafeUser } from '../../../api/auth.types'

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

vi.mock('../../../api/users.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/users.api')>()
  return {
    ...actual,
    tryListUsers: vi.fn(),
  }
})

function makeParticipant(
  overrides: Partial<ParticipantRecord> = {},
): ParticipantRecord {
  return {
    id: 'p1',
    eventId: 'e1',
    userId: 'u2',
    externalName: null,
    participantType: 'Student',
    registrationStatus: 'Registered',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    user: { id: 'u2', firstName: 'Ben', lastName: 'Ada', email: 'ben@x.com' },
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
  return mount(ParticipantsSection, {
    props: {
      eventId: 'e1',
      status: 'Approved',
      canManage: true,
      ...props,
    },
  })
}

describe('ParticipantsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listParticipants).mockResolvedValue([])
    vi.mocked(tryListUsers).mockResolvedValue(null)
  })

  it('shows a status gate and skips loading before approval', async () => {
    const wrapper = mountSection({ status: 'Draft' })
    await flushPromises()

    expect(wrapper.find('[data-testid="participants-gated"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="participants-gated"]').text()).toContain('Draft')
    expect(wrapper.find('[data-testid="participant-add-form"]').exists()).toBe(false)
    expect(listParticipants).not.toHaveBeenCalled()
    expect(tryListUsers).not.toHaveBeenCalled()
  })

  it('adds an external guest through the external mode', async () => {
    const guest = makeParticipant({
      id: 'p9',
      userId: null,
      externalName: 'Jane Guest',
      participantType: 'Guest',
      user: null,
    })
    vi.mocked(listParticipants)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([guest])
    vi.mocked(addParticipant).mockResolvedValue(guest)

    const wrapper = mountSection()
    await flushPromises()

    const submit = wrapper.find<HTMLButtonElement>('[data-testid="participant-add"]')
    expect(submit.element.disabled).toBe(true)

    await wrapper.find('[data-testid="participant-mode-external"]').setValue('external')
    await wrapper
      .find('[data-testid="participant-external-name"]')
      .setValue('Jane Guest')
    expect(submit.element.disabled).toBe(false)
    await wrapper.find('[data-testid="participant-add-form"]').trigger('submit')
    await flushPromises()

    expect(addParticipant).toHaveBeenCalledWith('e1', {
      externalName: 'Jane Guest',
    })
    expect(wrapper.find('[data-testid="participants-notice"]').text()).toContain(
      'External guest added',
    )
    expect(wrapper.text()).toContain('Jane Guest')
    expect(listParticipants).toHaveBeenCalledTimes(2)
  })

  it('adds a system user from the directory picker when available', async () => {
    vi.mocked(tryListUsers).mockResolvedValue([makeUser()])
    vi.mocked(addParticipant).mockResolvedValue(makeParticipant())

    const wrapper = mountSection()
    await flushPromises()

    const select = wrapper.find('[data-testid="participant-user-select"]')
    expect(select.exists()).toBe(true)
    await select.setValue('u9')
    await wrapper.find('[data-testid="participant-add-form"]').trigger('submit')
    await flushPromises()

    expect(addParticipant).toHaveBeenCalledWith('e1', {
      userId: 'u9',
      participantType: 'Student',
    })
  })

  it('falls back to a free-form user ID when the directory is unavailable', async () => {
    vi.mocked(tryListUsers).mockResolvedValue(null)
    vi.mocked(addParticipant).mockResolvedValue(makeParticipant())

    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="participant-user-select"]').exists()).toBe(false)
    const input = wrapper.find('[data-testid="participant-user-id"]')
    expect(input.exists()).toBe(true)
    await input.setValue('u7')
    await wrapper.find('[data-testid="participant-add-form"]').trigger('submit')
    await flushPromises()

    expect(addParticipant).toHaveBeenCalledWith('e1', {
      userId: 'u7',
      participantType: 'Student',
    })
  })

  it('removes a participant and refreshes the roster', async () => {
    vi.mocked(listParticipants)
      .mockResolvedValueOnce([makeParticipant()])
      .mockResolvedValueOnce([])
    vi.mocked(removeParticipant).mockResolvedValue()

    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="participant-row-p1"]').exists()).toBe(true)
    await wrapper.find('[data-testid="participant-remove-p1"]').trigger('click')
    await flushPromises()

    expect(removeParticipant).toHaveBeenCalledWith('e1', 'p1')
    expect(wrapper.find('[data-testid="participants-notice"]').text()).toContain(
      'removed',
    )
    expect(wrapper.find('[data-testid="participants-empty"]').exists()).toBe(true)
  })

  it('hides management controls for viewers without manage rights', async () => {
    vi.mocked(listParticipants).mockResolvedValue([makeParticipant()])

    const wrapper = mountSection({ canManage: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="participant-add-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="participant-remove-p1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="participants-table"]').exists()).toBe(true)
    expect(tryListUsers).not.toHaveBeenCalled()
  })
})
