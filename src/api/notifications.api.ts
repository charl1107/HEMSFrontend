import { http } from './http'

export const NOTIFICATION_TYPES = [
  'EventSubmitted',
  'EventApproved',
  'EventRejected',
  'RevisionRequested',
  'TaskAssigned',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface NotificationRecord {
  id: string
  userId: string
  eventId: string | null
  type: NotificationType
  message: string
  isRead: boolean
  createdAt: string
  updatedAt: string
}

export function countUnread(notifications: NotificationRecord[]): number {
  return notifications.filter((n) => !n.isRead).length
}

export async function listNotifications(): Promise<NotificationRecord[]> {
  const { data } = await http.get<NotificationRecord[]>('/notifications')
  return data
}

export async function markNotificationRead(
  id: string,
): Promise<NotificationRecord> {
  const { data } = await http.patch<NotificationRecord>(
    `/notifications/${id}/read`,
  )
  return data
}
