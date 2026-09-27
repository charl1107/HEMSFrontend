import { describe, expect, it } from 'vitest'
import { parseApprovalConflict } from './approvals.api'

function axiosLike(status: number, data: unknown): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  })
}

describe('parseApprovalConflict', () => {
  it('parses a 409 body with conflict and requiresOverride', () => {
    const conflict = {
      id: 'e2',
      title: 'Other Fair',
      venue: 'Main Hall',
      eventDate: '2026-05-01T00:00:00.000Z',
    }
    const err = axiosLike(409, {
      message: 'Venue conflict: "Other Fair"',
      conflict,
      requiresOverride: true,
    })

    const parsed = parseApprovalConflict(err)
    expect(parsed).not.toBeNull()
    expect(parsed?.message).toBe('Venue conflict: "Other Fair"')
    expect(parsed?.conflict).toEqual(conflict)
    expect(parsed?.requiresOverride).toBe(true)
  })

  it('returns null for a 409 without requiresOverride', () => {
    const err = axiosLike(409, { message: 'event status changed' })
    expect(parseApprovalConflict(err)).toBeNull()
  })

  it('returns null for non-409 errors', () => {
    expect(parseApprovalConflict(axiosLike(400, { message: 'bad' }))).toBeNull()
    expect(parseApprovalConflict(new Error('boom'))).toBeNull()
    expect(parseApprovalConflict(null)).toBeNull()
  })

  it('returns null when conflict payload is missing', () => {
    const err = axiosLike(409, { message: 'conflict', requiresOverride: true })
    expect(parseApprovalConflict(err)).toBeNull()
  })
})
