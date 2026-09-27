import { COVER_ALLOWED_MIME, COVER_MAX_BYTES } from '../../../api/events.api'

export interface EventFormValues {
  title: string
  description: string
  eventDate: string
  venue: string
  department: string
  campusScope: 'OnCampus' | 'OffCampus'
}

export type EventFormField = keyof EventFormValues

export type FieldErrors = Partial<Record<EventFormField, string>>

export function validateEventForm(values: EventFormValues): FieldErrors {
  const errors: FieldErrors = {}

  if (!values.title.trim()) {
    errors.title = 'Title is required'
  }

  if (!values.eventDate.trim()) {
    errors.eventDate = 'Event date is required'
  } else if (Number.isNaN(Date.parse(values.eventDate))) {
    errors.eventDate = 'Event date must be a valid date'
  }

  if (!values.venue.trim()) {
    errors.venue = 'Venue is required'
  }

  return errors
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export interface CoverFileCheck {
  ok: boolean
  message?: string
}

export function precheckCoverFile(file: {
  type: string
  size: number
}): CoverFileCheck {
  if (!(COVER_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      message: `Cover image must be one of: ${COVER_ALLOWED_MIME.join(', ')}`,
    }
  }
  if (file.size > COVER_MAX_BYTES) {
    return {
      ok: false,
      message: 'Cover image must be 5MB or smaller',
    }
  }
  if (file.size === 0) {
    return { ok: false, message: 'Cover image file is empty' }
  }
  return { ok: true }
}

export function toEventPayload(values: EventFormValues): {
  title: string
  description: string
  eventDate: string
  venue: string
  department: string
  campusScope: 'OnCampus' | 'OffCampus'
} {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    eventDate: values.eventDate,
    venue: values.venue.trim(),
    department: values.department.trim(),
    campusScope: values.campusScope,
  }
}
