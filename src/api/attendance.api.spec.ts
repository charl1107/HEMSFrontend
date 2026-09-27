import { describe, expect, it, vi, beforeEach } from 'vitest'
import { http } from './http'
import {
  attendanceName,
  listAttendance,
  listMyAttendance,
  syncAttendance,
  timeIn,
  timeOut,
} from './attendance.api'

vi.mock('./http', () => ({
  http: { get: vi.fn(), post: vi.fn() },
}))

describe('attendance.api', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GETs /events/:eventId/attendance', async () => {
    const rows = [{ id: 'a1' }]
    vi.mocked(http.get).mockResolvedValue({ data: rows })

    await expect(listAttendance('e1')).resolves.toEqual(rows)
    expect(http.get).toHaveBeenCalledWith('/events/e1/attendance')
  })

  it('GETs /attendance/me for the signed-in user', async () => {
    const rows = [{ id: 'a1', event: { id: 'e1' }, attendance: { id: 'a1' } }]
    vi.mocked(http.get).mockResolvedValue({ data: rows })

    await expect(listMyAttendance()).resolves.toEqual(rows)
    expect(http.get).toHaveBeenCalledWith('/attendance/me')
  })

  it('POSTs time-in with participantId', async () => {
    const row = { id: 'a1' }
    vi.mocked(http.post).mockResolvedValue({ data: row })

    await expect(timeIn('e1', 'p1')).resolves.toEqual(row)
    expect(http.post).toHaveBeenCalledWith('/events/e1/attendance/time-in', {
      participantId: 'p1',
    })
  })

  it('POSTs time-out with participantId', async () => {
    const row = { id: 'a1' }
    vi.mocked(http.post).mockResolvedValue({ data: row })

    await expect(timeOut('e1', 'p1')).resolves.toEqual(row)
    expect(http.post).toHaveBeenCalledWith('/events/e1/attendance/time-out', {
      participantId: 'p1',
    })
  })

  it('POSTs batch sync to /attendance/sync', async () => {
    const result = { accepted: ['c1'], rejected: [] }
    vi.mocked(http.post).mockResolvedValue({ data: result })
    const records = [
      {
        clientRecordId: 'c1',
        eventId: 'e1',
        participantId: 'p1',
        status: 'Present' as const,
        deviceId: 'd1',
        recordedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    await expect(syncAttendance(records)).resolves.toEqual(result)
    expect(http.post).toHaveBeenCalledWith('/attendance/sync', { records })
  })

  it('builds display names from user or external guest', () => {
    expect(
      attendanceName({
        id: 'p1',
        externalName: null,
        participantType: 'Student',
        user: { id: 'u1', firstName: 'Ana', lastName: 'Cruz', email: 'a@x.com' },
      }),
    ).toBe('Ana Cruz')
    expect(
      attendanceName({
        id: 'p2',
        externalName: 'Walk-in Guest',
        participantType: 'Guest',
        user: null,
      }),
    ).toBe('Walk-in Guest')
  })
})
