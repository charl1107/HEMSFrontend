import { http } from './http'

export const COMMITTEE_MANAGER_ROLES = ['Admin', 'Department Head'] as const

export interface CommitteeUserRef {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface CommitteeMemberRecord {
  id: string
  committeeId: string
  userId: string
  createdAt: string
  user: CommitteeUserRef
}

export interface CommitteeRecord {
  id: string
  eventId: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  members: CommitteeMemberRecord[]
}

export interface CreateCommitteeInput {
  name: string
  description?: string
}

export function committeeMemberName(member: CommitteeMemberRecord): string {
  return `${member.user.firstName} ${member.user.lastName}`
}

export async function listCommittees(eventId: string): Promise<CommitteeRecord[]> {
  const { data } = await http.get<CommitteeRecord[]>(`/events/${eventId}/committees`)
  return data
}

export async function createCommittee(
  eventId: string,
  input: CreateCommitteeInput,
): Promise<CommitteeRecord> {
  const { data } = await http.post<CommitteeRecord>(
    `/events/${eventId}/committees`,
    input,
  )
  return data
}

export async function addCommitteeMember(
  eventId: string,
  committeeId: string,
  userId: string,
): Promise<CommitteeRecord> {
  const { data } = await http.post<CommitteeRecord>(
    `/events/${eventId}/committees/${committeeId}/members`,
    { userId },
  )
  return data
}

export async function removeCommitteeMember(
  eventId: string,
  committeeId: string,
  userId: string,
): Promise<void> {
  await http.delete(`/events/${eventId}/committees/${committeeId}/members/${userId}`)
}
