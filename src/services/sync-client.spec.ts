import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncAttendance } from '../api/attendance.api'
import {
  countPending,
  enqueue,
  listPendingRecords,
  listRejectedRecords,
  resetAttendanceQueueForTests,
} from './attendance-queue'
import { syncClient } from './sync-client'

vi.mock('../api/attendance.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/attendance.api')>()
  return {
    ...actual,
    syncAttendance: vi.fn(),
  }
})

function makeQueued(clientRecordId: string, overrides: Record<string, unknown> = {}) {
  return {
    clientRecordId,
    eventId: 'e1',
    participantId: 'p1',
    participantName: 'Ana Cruz',
    status: 'Present' as const,
    deviceId: 'device-1',
    recordedAt: '2026-01-01T00:00:00.000Z',
    timeIn: '2026-01-01T08:00:00.000Z',
    ...overrides,
  }
}

describe('syncClient.flush', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await resetAttendanceQueueForTests()
  })

  it('posts pending records to /attendance/sync and marks accepted synced', async () => {
    await enqueue(makeQueued('c1'))
    await enqueue(makeQueued('c2', { participantId: 'p2' }))
    vi.mocked(syncAttendance).mockResolvedValue({
      accepted: ['c1', 'c2'],
      rejected: [],
    })

    const result = await syncClient.flush()

    expect(syncAttendance).toHaveBeenCalledTimes(1)
    const posted = vi.mocked(syncAttendance).mock.calls[0]?.[0]
    expect(posted).toHaveLength(2)
    expect(posted?.map((r) => r.clientRecordId)).toEqual(['c1', 'c2'])
    expect(result).toEqual({
      sent: 2,
      accepted: ['c1', 'c2'],
      rejected: [],
      remainingPending: 0,
    })
    expect(await countPending()).toBe(0)
  })

  it('is safe to call twice — second flush finds nothing pending', async () => {
    await enqueue(makeQueued('c1'))
    vi.mocked(syncAttendance).mockResolvedValue({
      accepted: ['c1'],
      rejected: [],
    })

    await syncClient.flush()
    const second = await syncClient.flush()

    expect(syncAttendance).toHaveBeenCalledTimes(1)
    expect(second.sent).toBe(0)
    expect(second.accepted).toEqual([])
  })

  it('keeps rejected records out of pending and surfaces the reason', async () => {
    await enqueue(makeQueued('c1'))
    await enqueue(makeQueued('c2'))
    vi.mocked(syncAttendance).mockResolvedValue({
      accepted: ['c1'],
      rejected: [{ clientRecordId: 'c2', reason: 'Event not found' }],
    })

    const result = await syncClient.flush()

    expect(result.accepted).toEqual(['c1'])
    expect(result.rejected).toEqual([
      { clientRecordId: 'c2', reason: 'Event not found' },
    ])
    expect(result.remainingPending).toBe(0)
    expect(await countPending()).toBe(0)
    const rejected = await listRejectedRecords()
    expect(rejected).toHaveLength(1)
    expect(rejected[0]?.rejectReason).toBe('Event not found')
    expect(rejected[0]?.participantName).toBe('Ana Cruz')
  })

  it('leaves records pending when the network call fails', async () => {
    await enqueue(makeQueued('c1'))
    vi.mocked(syncAttendance).mockRejectedValue(new Error('Network Error'))

    await expect(syncClient.flush()).rejects.toThrow('Network Error')
    expect(await countPending()).toBe(1)
    const pending = await listPendingRecords()
    expect(pending[0]?.syncState).toBe('pending')
  })

  it('does not call the API when the queue is empty', async () => {
    const result = await syncClient.flush()
    expect(syncAttendance).not.toHaveBeenCalled()
    expect(result.sent).toBe(0)
  })
})
