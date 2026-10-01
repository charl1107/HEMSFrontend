import { http } from './http'
import type { ScheduleRecord } from './schedule.api'

/**
 * Public (unauthenticated) schedule read for the event detail page.
 *
 * The endpoint is `GET /public/events/:id/schedule`, which answers 200 only
 * for public statuses and 404 otherwise — unlike the authenticated
 * `listSchedule`, an anonymous visitor no longer gets a 401 (and the false
 * "no schedule published" empty state that came with it).
 */
export async function getPublicSchedule(id: string): Promise<ScheduleRecord[]> {
  const { data } = await http.get<{ items: ScheduleRecord[] }>(
    `/public/events/${id}/schedule`,
  )
  return data.items
}
