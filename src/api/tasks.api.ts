import { http } from './http'

export const TASK_STATUSES = ['Todo', 'InProgress', 'Done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface TaskUserRef {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface TaskRecord {
  id: string
  eventId: string
  title: string
  description: string | null
  assignedToUserId: string | null
  deadline: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
  assignedToUser: TaskUserRef | null
}

export interface CreateTaskInput {
  title: string
  description?: string
  assignedToUserId?: string | null
  deadline: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  assignedToUserId?: string | null
  deadline?: string
  status?: TaskStatus
}

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value)
}

export async function listTasks(eventId: string): Promise<TaskRecord[]> {
  const { data } = await http.get<TaskRecord[]>(`/events/${eventId}/tasks`)
  return data
}

export async function createTask(
  eventId: string,
  input: CreateTaskInput,
): Promise<TaskRecord> {
  const { data } = await http.post<TaskRecord>(`/events/${eventId}/tasks`, input)
  return data
}

export async function updateTask(
  eventId: string,
  id: string,
  input: UpdateTaskInput,
): Promise<TaskRecord> {
  const { data } = await http.patch<TaskRecord>(
    `/events/${eventId}/tasks/${id}`,
    input,
  )
  return data
}

export async function removeTask(eventId: string, id: string): Promise<void> {
  await http.delete(`/events/${eventId}/tasks/${id}`)
}
