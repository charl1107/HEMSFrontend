import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  listAuditLogs,
  summarizeAuditBody,
  type AuditLogPage,
} from './audit.api'

vi.mock('./http', () => ({
  http: { get: vi.fn() },
}))

import { http } from './http'

const mockedGet = vi.mocked(http.get)

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
        body: { action: 'approve' },
        statusCode: 200,
        createdAt: '2026-09-01T10:00:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    ...overrides,
  }
}

describe('listAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGet.mockResolvedValue({ data: makePage() })
  })

  it('requests /audit with defaults', async () => {
    const result = await listAuditLogs()
    expect(mockedGet).toHaveBeenCalledWith('/audit', {
      params: { page: 1, pageSize: 20 },
    })
    expect(result.total).toBe(1)
  })

  it('passes filter query params', async () => {
    await listAuditLogs({
      userId: 'u9',
      entity: 'events',
      action: 'approve',
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
      page: 2,
      pageSize: 50,
    })
    expect(mockedGet).toHaveBeenCalledWith('/audit', {
      params: {
        userId: 'u9',
        entity: 'events',
        action: 'approve',
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
        page: 2,
        pageSize: 50,
      },
    })
  })

  it('omits empty filters from params', async () => {
    await listAuditLogs({ userId: '', entity: undefined, page: 1 })
    expect(mockedGet).toHaveBeenCalledWith('/audit', {
      params: { page: 1, pageSize: 20 },
    })
  })
})

describe('summarizeAuditBody', () => {
  it('summarizes object keys', () => {
    expect(summarizeAuditBody({ title: 'Fair', status: 'Draft' })).toBe(
      'title=Fair, status=Draft',
    )
  })

  it('handles empty and non-object bodies', () => {
    expect(summarizeAuditBody(null)).toBe('—')
    expect(summarizeAuditBody({})).toBe('—')
    expect(summarizeAuditBody('raw')).toBe('raw')
  })

  it('caps nested values', () => {
    expect(summarizeAuditBody({ nested: { a: 1 } })).toBe('nested={…}')
    expect(summarizeAuditBody({ list: [1, 2] })).toBe('list=[…]')
  })
})
