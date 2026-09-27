import { http } from './http'

export interface ParticipantUserRef {
  id: string
  firstName: string
  lastName: string
  email: string
}

export type ParticipantType = 'Student' | 'Staff' | 'Guest'

export interface ParticipantRecord {
  id: string
  eventId: string
  userId: string | null
  externalName: string | null
  participantType: ParticipantType
  registrationStatus: string
  createdAt: string
  updatedAt: string
  user: ParticipantUserRef | null
}

export interface AddParticipantInput {
  userId?: string
  externalName?: string
  participantType?: 'Student' | 'Staff'
}

export function participantDisplayName(participant: ParticipantRecord): string {
  if (participant.user) {
    return `${participant.user.firstName} ${participant.user.lastName}`
  }
  return participant.externalName ?? 'Unknown guest'
}

export async function listParticipants(eventId: string): Promise<ParticipantRecord[]> {
  const { data } = await http.get<ParticipantRecord[]>(`/events/${eventId}/participants`)
  return data
}

export async function addParticipant(
  eventId: string,
  input: AddParticipantInput,
): Promise<ParticipantRecord> {
  const { data } = await http.post<ParticipantRecord>(
    `/events/${eventId}/participants`,
    input,
  )
  return data
}

export async function removeParticipant(eventId: string, id: string): Promise<void> {
  await http.delete(`/events/${eventId}/participants/${id}`)
}
