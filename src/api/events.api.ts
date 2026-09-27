import { http } from './http'

export const COVER_MAX_BYTES = 5 * 1024 * 1024
export const COVER_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

export const EVENT_STATUSES = [
  'Draft',
  'PendingApproval',
  'RevisionRequired',
  'Approved',
  'Rejected',
  'Planning',
  'Ongoing',
  'Completed',
  'Cancelled',
] as const

export const EVENT_CAMPUS_SCOPES = ['OnCampus', 'OffCampus'] as const

export const SUBMIT_EVENT_ROLES = [
  'Event Coordinator',
  'Student Officer',
  'Department Head',
  'Admin',
] as const

export const REVIEW_EVENT_ROLES = [
  'Department Head',
  'Event Coordinator',
  'Admin',
] as const

export const ROSTER_MANAGER_ROLES = [
  'Event Coordinator',
  'Instructor',
  'Student Officer',
  'Department Head',
  'Admin',
] as const

export const EVENT_READ_ROLES = [
  'Department Head',
  'Event Coordinator',
  'Instructor',
  'Student Officer',
  'Admin',
] as const

export const EDITABLE_EVENT_STATUSES = ['Draft', 'RevisionRequired'] as const

export const ROSTER_EVENT_STATUSES = [
  'Approved',
  'Planning',
  'Ongoing',
  'Completed',
] as const

export const PLANNING_EXCLUDED_STATUSES = ['Cancelled', 'Rejected'] as const

export interface EventTypeRef {
  id: string
  name: string
}

export interface EventRecord {
  id: string
  title: string
  description: string | null
  eventDate: string
  venue: string
  department?: string | null
  campusScope?: (typeof EVENT_CAMPUS_SCOPES)[number]
  status: string
  coverImageUrl: string | null
  eventTypeId: string | null
  eventType: EventTypeRef | null
  createdById: string | null
  createdAt: string
  updatedAt: string
}

export interface EventMutationResult extends EventRecord {
  conflictWarning: string | null
}

export interface EventInput {
  title: string
  description?: string
  eventDate: string
  venue: string
  department?: string
  campusScope?: (typeof EVENT_CAMPUS_SCOPES)[number]
  eventTypeId?: string
}

export function isEditableStatus(status: string): boolean {
  return (EDITABLE_EVENT_STATUSES as readonly string[]).includes(status)
}

export function isRosterStatus(status: string): boolean {
  return (ROSTER_EVENT_STATUSES as readonly string[]).includes(status)
}

export function isPlanningAllowedStatus(status: string): boolean {
  return !(PLANNING_EXCLUDED_STATUSES as readonly string[]).includes(status)
}

export function resolveCoverSrc(coverImageUrl: string | null | undefined): string | null {
  if (!coverImageUrl) return null
  if (/^https?:\/\//i.test(coverImageUrl)) return coverImageUrl
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  return `${base}${coverImageUrl}`
}

export interface EventListParams {
  limit?: number
  offset?: number
  status?: string
  type?: string
  campusScope?: string
}

export interface EventPage {
  items: EventRecord[]
  total: number
}

function listQuery(params: EventListParams): string {
  const query = new URLSearchParams()
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  if (params.offset !== undefined) query.set('offset', String(params.offset))
  if (params.status) query.set('status', params.status)
  if (params.type) query.set('type', params.type)
  if (params.campusScope) query.set('campusScope', params.campusScope)
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export async function listPublicEvents(params: EventListParams = {}): Promise<EventPage> {
  const { data } = await http.get<EventPage>(`/public/events${listQuery(params)}`)
  return data
}

export async function getPublicEvent(id: string): Promise<EventRecord> {
  const { data } = await http.get<EventRecord>(`/public/events/${id}`)
  return data
}

export async function listEvents(params: EventListParams = {}): Promise<EventPage> {
  const { data } = await http.get<EventPage>(`/events${listQuery(params)}`)
  return data
}

export async function getEvent(id: string): Promise<EventRecord> {
  const { data } = await http.get<EventRecord>(`/events/${id}`)
  return data
}

export async function createEvent(input: EventInput): Promise<EventMutationResult> {
  const { data } = await http.post<EventMutationResult>('/events', input)
  return data
}

export async function updateEvent(
  id: string,
  input: Partial<EventInput>,
): Promise<EventMutationResult> {
  const { data } = await http.put<EventMutationResult>(`/events/${id}`, input)
  return data
}

export async function deleteEvent(id: string): Promise<void> {
  await http.delete(`/events/${id}`)
}

export async function uploadCover(id: string, file: File): Promise<EventRecord> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await http.post<EventRecord>(`/events/${id}/cover`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function removeCover(id: string): Promise<EventRecord> {
  const { data } = await http.delete<EventRecord>(`/events/${id}/cover`)
  return data
}
