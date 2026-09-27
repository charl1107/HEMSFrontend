import { http } from './http'

export interface ScheduleRecord {
  id: string
  eventId: string
  activityName: string
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
}

export interface CreateScheduleInput {
  activityName: string
  startTime: string
  endTime: string
}

export interface UpdateScheduleInput {
  activityName?: string
  startTime?: string
  endTime?: string
}

export function scheduleTimesError(
  startTime: string,
  endTime: string,
): string | null {
  if (!startTime || !endTime) return 'Start and end time are required'
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 'Enter a valid date and time'
  }
  if (!(end > start)) return 'End time must be after start time'
  return null
}

export function toIsoDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid datetime value: ${value}`)
  }
  return date.toISOString()
}

export async function listSchedule(eventId: string): Promise<ScheduleRecord[]> {
  const { data } = await http.get<ScheduleRecord[]>(
    `/events/${eventId}/schedule`,
  )
  return data
}

export async function createSchedule(
  eventId: string,
  input: CreateScheduleInput,
): Promise<ScheduleRecord> {
  const { data } = await http.post<ScheduleRecord>(
    `/events/${eventId}/schedule`,
    input,
  )
  return data
}

export async function updateSchedule(
  eventId: string,
  id: string,
  input: UpdateScheduleInput,
): Promise<ScheduleRecord> {
  const { data } = await http.patch<ScheduleRecord>(
    `/events/${eventId}/schedule/${id}`,
    input,
  )
  return data
}

export async function removeSchedule(
  eventId: string,
  id: string,
): Promise<void> {
  await http.delete(`/events/${eventId}/schedule/${id}`)
}
