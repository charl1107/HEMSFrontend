import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  countPending,
  enqueue,
  listPendingRecords,
  listRejectedRecords,
  markRejected,
  markSynced,
  resetAttendanceQueueForTests,
  saveRosterSnapshot,
  loadRosterSnapshot,
  toSyncRecord,
  type QueuedAttendanceRecord,
} from './attendance-queue'

function makeQueued(
  overrides: Partial<QueuedAttendanceRecord> = {},
): Omit<QueuedAttendanceRecord, 'syncState' | 'rejectReason'> {
  return {
    clientRecordId: 'c1',
    eventId: 'e1',
    participantId: 'p1',
    participantName: 'Ana Cruz',
    status: 'Present',
    deviceId: 'device-1',
    recordedAt: '2026-01-01T00:00:00.000Z',
    timeIn: '2026-01-01T08:00:00.000Z',
    ...overrides,
  }
}

describe('attendance-queue', () => {
  beforeEach(async () => {
    await resetAttendanceQueueForTests()
  })

  it('enqueues a record as pending', async () => {
    const result = await enqueue(makeQueued())
    expect(result).toBe('queued')
    expect(await countPending()).toBe(1)
    const pending = await listPendingRecords()
    expect(pending[0]?.clientRecordId).toBe('c1')
    expect(pending[0]?.syncState).toBe('pending')
  })

  it('is idempotent by clientRecordId', async () => {
    await enqueue(makeQueued())
    const second = await enqueue(
      makeQueued({ participantName: 'Changed Name' }),
    )
    expect(second).toBe('exists')
    expect(await countPending()).toBe(1)
    const pending = await listPendingRecords()
    expect(pending[0]?.participantName).toBe('Ana Cruz')
  })

  it('stores distinct clientRecordIds as separate records', async () => {
    await enqueue(makeQueued({ clientRecordId: 'c1' }))
    await enqueue(makeQueued({ clientRecordId: 'c2', participantId: 'p2' }))
    expect(await countPending()).toBe(2)
  })

  it('marks accepted records synced so they leave the pending set', async () => {
    await enqueue(makeQueued({ clientRecordId: 'c1' }))
    await enqueue(makeQueued({ clientRecordId: 'c2' }))
    await markSynced(['c1'])
    expect(await countPending()).toBe(1)
    const pending = await listPendingRecords()
    expect(pending[0]?.clientRecordId).toBe('c2')
  })

  it('surfaces rejected records with their reason', async () => {
    await enqueue(makeQueued({ clientRecordId: 'c1' }))
    await markRejected('c1', 'Event not found')
    expect(await countPending()).toBe(0)
    const rejected = await listRejectedRecords()
    expect(rejected).toHaveLength(1)
    expect(rejected[0]?.rejectReason).toBe('Event not found')
    expect(rejected[0]?.syncState).toBe('rejected')
  })

  it('ignores markSynced/markRejected for unknown ids', async () => {
    await expect(markSynced(['missing'])).resolves.toBeUndefined()
    await expect(markRejected('missing', 'nope')).resolves.toBeUndefined()
    expect(await countPending()).toBe(0)
  })

  it('maps queued records to sync payload without queue metadata', () => {
    const payload = toSyncRecord({
      ...makeQueued(),
      syncState: 'pending',
    } as QueuedAttendanceRecord)
    expect(payload).toEqual({
      clientRecordId: 'c1',
      eventId: 'e1',
      participantId: 'p1',
      status: 'Present',
      deviceId: 'device-1',
      recordedAt: '2026-01-01T00:00:00.000Z',
      timeIn: '2026-01-01T08:00:00.000Z',
    })
    expect(payload).not.toHaveProperty('syncState')
    expect(payload).not.toHaveProperty('participantName')
  })

  it('round-trips a roster snapshot keyed by eventId', async () => {
    await saveRosterSnapshot({
      eventId: 'e1',
      participants: [],
      attendance: [],
      cachedAt: '2026-01-01T00:00:00.000Z',
    })
    const loaded = await loadRosterSnapshot('e1')
    expect(loaded?.eventId).toBe('e1')
    expect(await loadRosterSnapshot('missing')).toBeNull()
  })
})
