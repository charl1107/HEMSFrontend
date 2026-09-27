import { describe, expect, it } from 'vitest'
import {
  hasFieldErrors,
  precheckCoverFile,
  toEventPayload,
  validateEventForm,
  type EventFormValues,
} from './event-form'

const valid: EventFormValues = {
  title: 'Spring Fair',
  description: ' Campus fair',
  eventDate: '2026-05-01',
  venue: ' Main Hall ',
  department: ' Hospitality Management ',
  campusScope: 'OffCampus',
}

describe('validateEventForm', () => {
  it('accepts a valid form', () => {
    expect(validateEventForm(valid)).toEqual({})
    expect(hasFieldErrors(validateEventForm(valid))).toBe(false)
  })

  it('requires title, date, and venue', () => {
    const errors = validateEventForm({
      title: ' ',
      description: '',
      eventDate: '',
      venue: '',
      department: '',
      campusScope: 'OnCampus',
    })
    expect(errors.title).toBeTruthy()
    expect(errors.eventDate).toBeTruthy()
    expect(errors.venue).toBeTruthy()
    expect(hasFieldErrors(errors)).toBe(true)
  })

  it('rejects unparseable date', () => {
    const errors = validateEventForm({ ...valid, eventDate: 'not-a-date' })
    expect(errors.eventDate).toBeTruthy()
  })
})

describe('precheckCoverFile', () => {
  it('accepts jpeg under 5MB', () => {
    expect(precheckCoverFile({ type: 'image/jpeg', size: 1000 })).toEqual({ ok: true })
  })

  it('rejects wrong mime type', () => {
    const result = precheckCoverFile({ type: 'application/pdf', size: 10 })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('image/jpeg')
  })

  it('rejects files over 5MB', () => {
    const result = precheckCoverFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })
    expect(result.ok).toBe(false)
    expect(result.message).toContain('5MB')
  })

  it('rejects empty file', () => {
    expect(precheckCoverFile({ type: 'image/webp', size: 0 }).ok).toBe(false)
  })
})

describe('toEventPayload', () => {
  it('trims title and venue', () => {
    expect(toEventPayload(valid)).toEqual({
      title: 'Spring Fair',
      description: 'Campus fair',
      eventDate: '2026-05-01',
      venue: 'Main Hall',
      department: 'Hospitality Management',
      campusScope: 'OffCampus',
    })
  })
})
