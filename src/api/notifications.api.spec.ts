import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from './http'
import {
  countUnread,
  listNotifications,
  markNotificationRead,
  type NotificationRecord,
} from './notifications.api'

vi.mock('./http', () => ({
  http: { get: vi.fn(), patch: vi.fn() },
}))

function makeNotification(
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord {
  return {
    id: 'n1',
    userId: 'u1',
    eventId: 'e1',
    type: 'EventApproved',
    message: 'Event approved',
    isRead: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('listNotifications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GETs /notifications and returns the payload', async () => {
    const items = [makeNotification()]
    vi.mocked(http.get).mockResolvedValue({ data: items })

    await expect(listNotifications()).resolves.toEqual(items)
    expect(http.get).toHaveBeenCalledWith('/notifications')
  })
})

describe('markNotificationRead', () => {
  beforeEach(() => vi.clearAllMocks())

  it('PATCHes /notifications/:id/read and returns the updated record', async () => {
    const updated = makeNotification({ isRead: true })
    vi.mocked(http.patch).mockResolvedValue({ data: updated })

    await expect(markNotificationRead('n1')).resolves.toEqual(updated)
    expect(http.patch).toHaveBeenCalledWith('/notifications/n1/read')
  })
})

describe('countUnread', () => {
  it('counts records where isRead is false', () => {
    expect(
      countUnread([
        makeNotification({ id: 'a', isRead: false }),
        makeNotification({ id: 'b', isRead: true }),
        makeNotification({ id: 'c', isRead: false }),
      ]),
    ).toBe(2)
  })

  it('returns 0 for an empty list', () => {
    expect(countUnread([])).toBe(0)
  })
})
