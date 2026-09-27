import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http } from './http'
import {
  createTask,
  isTaskStatus,
  listTasks,
  removeTask,
  updateTask,
} from './tasks.api'

vi.mock('./http', () => ({
  http: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('listTasks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GETs /events/:eventId/tasks and returns the payload', async () => {
    const tasks = [{ id: 't1' }]
    vi.mocked(http.get).mockResolvedValue({ data: tasks })

    await expect(listTasks('e1')).resolves.toEqual(tasks)
    expect(http.get).toHaveBeenCalledWith('/events/e1/tasks')
  })
})

describe('createTask', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POSTs the payload to /events/:eventId/tasks', async () => {
    const created = { id: 't1', title: 'Book venue' }
    vi.mocked(http.post).mockResolvedValue({ data: created })
    const input = {
      title: 'Book venue',
      deadline: '2026-05-01T00:00:00.000Z',
      assignedToUserId: null,
    }

    await expect(createTask('e1', input)).resolves.toEqual(created)
    expect(http.post).toHaveBeenCalledWith('/events/e1/tasks', input)
  })
})

describe('updateTask', () => {
  beforeEach(() => vi.clearAllMocks())

  it('PATCHes the payload to /events/:eventId/tasks/:id', async () => {
    const updated = { id: 't1', status: 'Done' }
    vi.mocked(http.patch).mockResolvedValue({ data: updated })

    await expect(updateTask('e1', 't1', { status: 'Done' })).resolves.toEqual(
      updated,
    )
    expect(http.patch).toHaveBeenCalledWith('/events/e1/tasks/t1', {
      status: 'Done',
    })
  })
})

describe('removeTask', () => {
  beforeEach(() => vi.clearAllMocks())

  it('DELETEs /events/:eventId/tasks/:id', async () => {
    vi.mocked(http.delete).mockResolvedValue({})

    await removeTask('e1', 't1')
    expect(http.delete).toHaveBeenCalledWith('/events/e1/tasks/t1')
  })
})

describe('isTaskStatus', () => {
  it('accepts Todo, InProgress, and Done', () => {
    expect(isTaskStatus('Todo')).toBe(true)
    expect(isTaskStatus('InProgress')).toBe(true)
    expect(isTaskStatus('Done')).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isTaskStatus('Bogus')).toBe(false)
    expect(isTaskStatus('')).toBe(false)
  })
})
