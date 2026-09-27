import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from './http'
import {
  createSchedule,
  listSchedule,
  removeSchedule,
  scheduleTimesError,
  toIsoDateTime,
  updateSchedule,
} from './schedule.api'

vi.mock('./http', () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('listSchedule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GETs /events/:eventId/schedule and returns the payload', async () => {
    const entries = [{ id: 's1' }]
    vi.mocked(http.get).mockResolvedValue({ data: entries })

    await expect(listSchedule('e1')).resolves.toEqual(entries)
    expect(http.get).toHaveBeenCalledWith('/events/e1/schedule')
  })
})

describe('createSchedule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POSTs the payload to /events/:eventId/schedule', async () => {
    const created = { id: 's1', activityName: 'Opening' }
    vi.mocked(http.post).mockResolvedValue({ data: created })
    const input = {
      activityName: 'Opening',
      startTime: '2026-05-01T09:00:00.000Z',
      endTime: '2026-05-01T10:00:00.000Z',
    }

    await expect(createSchedule('e1', input)).resolves.toEqual(created)
    expect(http.post).toHaveBeenCalledWith('/events/e1/schedule', input)
  })
})

describe('updateSchedule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('PATCHes the payload to /events/:eventId/schedule/:id', async () => {
    const updated = { id: 's1', activityName: 'Keynote' }
    vi.mocked(http.patch).mockResolvedValue({ data: updated })

    await expect(
      updateSchedule('e1', 's1', { activityName: 'Keynote' }),
    ).resolves.toEqual(updated)
    expect(http.patch).toHaveBeenCalledWith('/events/e1/schedule/s1', {
      activityName: 'Keynote',
    })
  })
})

describe('removeSchedule', () => {
  beforeEach(() => vi.clearAllMocks())

  it('DELETEs /events/:eventId/schedule/:id', async () => {
    vi.mocked(http.delete).mockResolvedValue({})

    await removeSchedule('e1', 's1')
    expect(http.delete).toHaveBeenCalledWith('/events/e1/schedule/s1')
  })
})

describe('scheduleTimesError', () => {
  it('accepts end after start', () => {
    expect(
      scheduleTimesError(
        '2026-05-01T09:00:00.000Z',
        '2026-05-01T10:00:00.000Z',
      ),
    ).toBeNull()
  })

  it('rejects end equal to start', () => {
    expect(
      scheduleTimesError(
        '2026-05-01T09:00:00.000Z',
        '2026-05-01T09:00:00.000Z',
      ),
    ).toContain('after')
  })

  it('rejects end before start', () => {
    expect(
      scheduleTimesError(
        '2026-05-01T10:00:00.000Z',
        '2026-05-01T09:00:00.000Z',
      ),
    ).toContain('after')
  })

  it('requires both times', () => {
    expect(scheduleTimesError('', '2026-05-01T10:00:00.000Z')).toContain(
      'required',
    )
    expect(scheduleTimesError('2026-05-01T09:00:00.000Z', '')).toContain(
      'required',
    )
  })

  it('rejects unparseable values', () => {
    expect(
      scheduleTimesError('nope', '2026-05-01T10:00:00.000Z'),
    ).toContain('valid')
    expect(
      scheduleTimesError('2026-05-01T09:00:00.000Z', 'nope'),
    ).toContain('valid')
  })
})

describe('toIsoDateTime', () => {
  it('converts a datetime-local value to a full ISO string', () => {
    const iso = toIsoDateTime('2026-05-01T09:30')
    expect(iso).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    )
    expect(new Date(iso).getTime()).toBe(
      new Date('2026-05-01T09:30').getTime(),
    )
  })

  it('returns NaN-safe output only for parseable input', () => {
    expect(() => toIsoDateTime('nope')).toThrow()
  })
})
