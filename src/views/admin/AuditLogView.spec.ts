// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuditLogView from './AuditLogView.vue'
import {
  listAuditLogs,
  type AuditLogFilters,
  type AuditLogPage,
} from '../../api/audit.api'
import { listUsers } from '../../api/users.api'

vi.mock('../../api/audit.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/audit.api')>()
  return { ...actual, listAuditLogs: vi.fn() }
})

vi.mock('../../api/users.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/users.api')>()
  return { ...actual, listUsers: vi.fn() }
})

function makePage(overrides: Partial<AuditLogPage> = {}): AuditLogPage {
  return {
    items: [
      {
        id: 'log-1',
        userId: 'u1',
        user: {
          id: 'u1',
          email: 'a@hems.local',
          firstName: 'Ada',
          lastName: 'Admin',
        },
        method: 'POST',
        path: '/events/evt-1/approve',
        entity: 'events',
        action: 'approve',
        body: { action: 'approve', eventId: 'evt-1' },
        statusCode: 200,
        createdAt: '2026-09-01T10:00:00.000Z',
      },
    ],
    total: 42,
    page: 1,
    pageSize: 20,
    ...overrides,
  }
}

async function mountView(): Promise<VueWrapper> {
  const wrapper = mount(AuditLogView)
  await flushPromises()
  return wrapper
}

describe('AuditLogView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listAuditLogs).mockResolvedValue(makePage())
    vi.mocked(listUsers).mockResolvedValue([
      {
        id: 'u1',
        email: 'a@hems.local',
        firstName: 'Ada',
        lastName: 'Admin',
        isActive: true,
        roles: ['Admin'],
        mustChangePassword: false,
      },
    ])
  })

  it('loads and renders audit entries with user and summary', async () => {
    const wrapper = await mountView()

    expect(listAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20 }),
    )
    expect(wrapper.text()).toContain('Ada Admin (a@hems.local)')
    expect(wrapper.text()).toContain('events')
    expect(wrapper.text()).toContain('approve')
    expect(wrapper.text()).toContain('action=approve, eventId=evt-1')
    expect(wrapper.text()).toContain('42 entries')
  })

  it('applies filters and resets to page 1', async () => {
    const wrapper = await mountView()
    vi.mocked(listAuditLogs).mockClear()
    vi.mocked(listAuditLogs).mockResolvedValue(makePage({ total: 0, items: [] }))

    await wrapper.find('[data-testid="audit-entity-filter"]').setValue('events')
    await wrapper.find('[data-testid="audit-action-filter"]').setValue('approve')
    await wrapper.find('[data-testid="audit-apply"]').trigger('click')
    await flushPromises()

    const filters = vi.mocked(listAuditLogs).mock.calls[0][0] as AuditLogFilters
    expect(filters.entity).toBe('events')
    expect(filters.action).toBe('approve')
    expect(filters.page).toBe(1)

    await wrapper.find('[data-testid="audit-reset"]').trigger('click')
    await flushPromises()
    const reset = vi.mocked(listAuditLogs).mock.calls[1][0] as AuditLogFilters
    expect(reset.entity).toBeUndefined()
    expect(reset.action).toBeUndefined()
  })

  it('surfaces load errors', async () => {
    vi.mocked(listAuditLogs).mockRejectedValue(new Error('boom'))
    const wrapper = await mountView()
    expect(wrapper.find('[data-testid="audit-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('boom')
  })
})
