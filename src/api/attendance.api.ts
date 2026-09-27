import { http } from './http'
import type { EventRecord } from './events.api'

export const ATTENDANCE_SUPERVISOR_ROLES = [
  'Event Coordinator',
  'Instructor',
  'Student Officer',
  'Admin',
  'Department Head',
] as const

export type AttendanceStatus = 'Present' | 'Absent'

export interface AttendanceParticipantUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface AttendanceParticipantRef {
  id: string
  externalName: string | null
  participantType: string
  user: AttendanceParticipantUser | null
}

export interface AttendanceRecord {
  id: string
  eventId: string
  participantId: string
  status: AttendanceStatus
  timeIn: string | null
  timeOut: string | null
  clientRecordId: string | null
  syncedAt: string | null
  createdAt: string
  updatedAt: string
  participant: AttendanceParticipantRef
}

export interface SyncAttendanceRecord {
  clientRecordId: string
  eventId: string
  participantId: string
  status: AttendanceStatus
  timeIn?: string
  timeOut?: string
  deviceId: string
  recordedAt: string
}

export interface SyncRejection {
  clientRecordId: string
  reason: string
}

export interface SyncResult {
  accepted: string[]
  rejected: SyncRejection[]
}

export function attendanceName(participant: AttendanceParticipantRef): string {
  if (participant.user) {
    return `${participant.user.firstName} ${participant.user.lastName}`
  }
  return participant.externalName ?? 'Unknown guest'
}

export interface MyAttendanceRow {
  event: EventRecord
  attendance: AttendanceRecord
}

export async function listAttendance(eventId: string): Promise<AttendanceRecord[]> {
  const { data } = await http.get<AttendanceRecord[]>(`/events/${eventId}/attendance`)
  return data
}

export async function listMyAttendance(): Promise<MyAttendanceRow[]> {
  const { data } = await http.get<MyAttendanceRow[]>('/attendance/me')
  return data
}

export async function timeIn(eventId: string, participantId: string): Promise<AttendanceRecord> {
  const { data } = await http.post<AttendanceRecord>(
    `/events/${eventId}/attendance/time-in`,
    { participantId },
  )
  return data
}

export async function timeOut(eventId: string, participantId: string): Promise<AttendanceRecord> {
  const { data } = await http.post<AttendanceRecord>(
    `/events/${eventId}/attendance/time-out`,
    { participantId },
  )
  return data
}

export async function syncAttendance(
  records: SyncAttendanceRecord[],
): Promise<SyncResult> {
  const { data } = await http.post<SyncResult>('/attendance/sync', { records })
  return data
}
