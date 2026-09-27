import { isAxiosError } from 'axios'
import { http } from './http'
import type { EventMutationResult, EventRecord } from './events.api'

export type ApprovalAction =
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  | 'RevisionRequested'

export interface ApprovalReviewerRef {
  id: string
  firstName: string
  lastName: string
}

export interface ApprovalRecord {
  id: string
  eventId: string
  reviewerId: string | null
  action: ApprovalAction
  comments: string | null
  createdAt: string
  reviewer: ApprovalReviewerRef | null
}

export interface ApprovalSummary {
  id: string
  eventId: string
  reviewerId: string | null
  action: ApprovalAction
  comments: string | null
  createdAt: string
}

export interface PendingApprovalRecord extends EventRecord {
  approvals: ApprovalSummary[]
}

export interface ConflictHit {
  id: string
  title: string
  venue: string
  eventDate: string
}

export interface ApprovalConflictError {
  message: string
  conflict: ConflictHit
  requiresOverride: true
}

export function parseApprovalConflict(err: unknown): ApprovalConflictError | null {
  if (!isAxiosError(err) || err.response?.status !== 409) return null
  const data = err.response.data as Partial<ApprovalConflictError> | undefined
  if (!data || data.requiresOverride !== true) return null
  if (!data.conflict || typeof data.conflict !== 'object') return null
  return {
    message:
      typeof data.message === 'string' && data.message
        ? data.message
        : 'Venue conflict detected',
    conflict: data.conflict as ConflictHit,
    requiresOverride: true,
  }
}

export async function submitForApproval(
  id: string,
  comments?: string,
): Promise<EventRecord> {
  const { data } = await http.post<EventRecord>(
    `/events/${id}/submit`,
    comments ? { comments } : {},
  )
  return data
}

export async function approveEvent(
  id: string,
  input: { comments?: string; overrideConflict?: boolean } = {},
): Promise<EventMutationResult> {
  const { data } = await http.post<EventMutationResult>(
    `/events/${id}/approve`,
    input,
  )
  return data
}

export async function rejectEvent(id: string, reason: string): Promise<EventRecord> {
  const { data } = await http.post<EventRecord>(`/events/${id}/reject`, { reason })
  return data
}

export async function requestRevision(
  id: string,
  comments: string,
): Promise<EventRecord> {
  const { data } = await http.post<EventRecord>(`/events/${id}/request-revision`, {
    comments,
  })
  return data
}

export async function getApprovalHistory(id: string): Promise<ApprovalRecord[]> {
  const { data } = await http.get<ApprovalRecord[]>(`/events/${id}/approval-history`)
  return data
}

export interface PendingListParams {
  limit?: number
  offset?: number
}

export interface PendingPage {
  items: PendingApprovalRecord[]
  total: number
}

export async function listPendingApprovals(
  params: PendingListParams = {},
): Promise<PendingPage> {
  const query = new URLSearchParams()
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  if (params.offset !== undefined) query.set('offset', String(params.offset))
  const qs = query.toString()
  const { data } = await http.get<PendingPage>(
    `/approvals/pending${qs ? `?${qs}` : ''}`,
  )
  return data
}
