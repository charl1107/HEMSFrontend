// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TasksSection from './TasksSection.vue'
import {
  createTask,
  listTasks,
  removeTask,
  updateTask,
  type TaskRecord,
} from '../../../api/tasks.api'
import { tryListUsers } from '../../../api/users.api'
import type { SafeUser } from '../../../api/auth.types'

vi.mock('../../../api/tasks.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/tasks.api')>()
  return {
    ...actual,
    listTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    removeTask: vi.fn(),
  }
})

vi.mock('../../../api/users.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/users.api')>()
  return {
    ...actual,
    tryListUsers: vi.fn(),
  }
})

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: 't1',
    eventId: 'e1',
    title: 'Book venue',
    description: null,
    assignedToUserId: null,
    deadline: '2026-05-01T00:00:00.000Z',
    status: 'Todo',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    assignedToUser: null,
    ...overrides,
  }
}

function makeUser(overrides: Partial<SafeUser> = {}): SafeUser {
  return {
    id: 'u9',
    email: 'joy@x.com',
    firstName: 'Joy',
    lastName: 'Ada',
    isActive: true,
    roles: [],
    mustChangePassword: false,
    ...overrides,
  }
}

function mountSection(
  props: { status?: string; canManage?: boolean } = {},
): VueWrapper {
  return mount(TasksSection, {
    props: {
      eventId: 'e1',
      status: 'Planning',
      canManage: true,
      ...props,
    },
  })
}

describe('TasksSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listTasks).mockResolvedValue([])
    vi.mocked(tryListUsers).mockResolvedValue(null)
  })

  it('gates on Cancelled and skips loading', async () => {
    const wrapper = mountSection({ status: 'Cancelled' })
    await flushPromises()

    const gate = wrapper.find('[data-testid="tasks-gated"]')
    expect(gate.exists()).toBe(true)
    expect(gate.text()).toContain('Cancelled')
    expect(wrapper.find('[data-testid="task-create-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tasks-table"]').exists()).toBe(false)
    expect(listTasks).not.toHaveBeenCalled()
    expect(tryListUsers).not.toHaveBeenCalled()
  })

  it('creates a task with assignee from the directory picker', async () => {
    vi.mocked(tryListUsers).mockResolvedValue([makeUser()])
    vi.mocked(listTasks)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeTask()])
    vi.mocked(createTask).mockResolvedValue(makeTask())

    const wrapper = mountSection()
    await flushPromises()

    const submit = wrapper.find<HTMLButtonElement>('[data-testid="task-create"]')
    expect(submit.element.disabled).toBe(true)

    await wrapper.find('[data-testid="task-title"]').setValue('Book venue')
    await wrapper.find('[data-testid="task-deadline"]').setValue('2026-05-10')
    expect(submit.element.disabled).toBe(false)
    await wrapper.find('[data-testid="task-assign-select"]').setValue('u9')
    await wrapper.find('[data-testid="task-create-form"]').trigger('submit')
    await flushPromises()

    expect(createTask).toHaveBeenCalledWith('e1', {
      title: 'Book venue',
      deadline: '2026-05-10T00:00:00.000Z',
      assignedToUserId: 'u9',
    })
    expect(wrapper.find('[data-testid="tasks-notice"]').text()).toContain(
      'created',
    )
    expect(listTasks).toHaveBeenCalledTimes(2)
  })

  it('falls back to a free-form user ID when the directory is unavailable', async () => {
    vi.mocked(tryListUsers).mockResolvedValue(null)
    vi.mocked(createTask).mockResolvedValue(makeTask())

    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="task-assign-select"]').exists()).toBe(false)
    await wrapper.find('[data-testid="task-title"]').setValue('Book venue')
    await wrapper.find('[data-testid="task-deadline"]').setValue('2026-05-10')
    await wrapper.find('[data-testid="task-assign-input"]').setValue('u7')
    await wrapper.find('[data-testid="task-create-form"]').trigger('submit')
    await flushPromises()

    expect(createTask).toHaveBeenCalledWith('e1', {
      title: 'Book venue',
      deadline: '2026-05-10T00:00:00.000Z',
      assignedToUserId: 'u7',
    })
  })

  it('updates task status through the status select', async () => {
    vi.mocked(listTasks)
      .mockResolvedValueOnce([makeTask()])
      .mockResolvedValueOnce([makeTask({ status: 'InProgress' })])
    vi.mocked(updateTask).mockResolvedValue(makeTask({ status: 'InProgress' }))

    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="task-status-t1"]').exists()).toBe(true)
    await wrapper.find('[data-testid="task-status-t1"]').setValue('InProgress')
    await flushPromises()

    expect(updateTask).toHaveBeenCalledWith('e1', 't1', {
      status: 'InProgress',
    })
    expect(wrapper.find('[data-testid="tasks-notice"]').text()).toContain(
      'status updated',
    )
    expect(
      (wrapper.find('[data-testid="task-status-t1"]').element as HTMLSelectElement)
        .value,
    ).toBe('InProgress')
  })

  it('updates a task deadline from the row input', async () => {
    vi.mocked(listTasks).mockResolvedValue([makeTask()])
    vi.mocked(updateTask).mockResolvedValue(
      makeTask({ deadline: '2026-06-01T00:00:00.000Z' }),
    )

    const wrapper = mountSection()
    await flushPromises()

    const input = wrapper.find<HTMLInputElement>('[data-testid="task-deadline-t1"]')
    expect(input.element.value).toBe('2026-05-01')
    await input.setValue('2026-06-01')
    await input.trigger('change')
    await flushPromises()

    expect(updateTask).toHaveBeenCalledWith('e1', 't1', {
      deadline: '2026-06-01T00:00:00.000Z',
    })
  })

  it('assigns an existing task through the row picker', async () => {
    vi.mocked(tryListUsers).mockResolvedValue([makeUser()])
    vi.mocked(listTasks).mockResolvedValue([makeTask()])
    vi.mocked(updateTask).mockResolvedValue(
      makeTask({ assignedToUserId: 'u9', assignedToUser: makeUser() as never }),
    )

    const wrapper = mountSection()
    await flushPromises()

    await wrapper.find('[data-testid="task-assign-t1"]').setValue('u9')
    await flushPromises()

    expect(updateTask).toHaveBeenCalledWith('e1', 't1', {
      assignedToUserId: 'u9',
    })
  })

  it('clears an assignment by selecting Unassigned', async () => {
    vi.mocked(tryListUsers).mockResolvedValue([makeUser()])
    vi.mocked(listTasks).mockResolvedValue([
      makeTask({
        assignedToUserId: 'u9',
        assignedToUser: {
          id: 'u9',
          firstName: 'Joy',
          lastName: 'Ada',
          email: 'joy@x.com',
        },
      }),
    ])
    vi.mocked(updateTask).mockResolvedValue(makeTask())

    const wrapper = mountSection()
    await flushPromises()

    await wrapper.find('[data-testid="task-assign-t1"]').setValue('')
    await flushPromises()

    expect(updateTask).toHaveBeenCalledWith('e1', 't1', {
      assignedToUserId: null,
    })
  })

  it('deletes a task and refreshes the list', async () => {
    vi.mocked(listTasks)
      .mockResolvedValueOnce([makeTask()])
      .mockResolvedValueOnce([])
    vi.mocked(removeTask).mockResolvedValue()

    const wrapper = mountSection()
    await flushPromises()

    expect(wrapper.find('[data-testid="task-row-t1"]').exists()).toBe(true)
    await wrapper.find('[data-testid="task-delete-t1"]').trigger('click')
    await flushPromises()

    expect(removeTask).toHaveBeenCalledWith('e1', 't1')
    expect(wrapper.find('[data-testid="tasks-notice"]').text()).toContain(
      'deleted',
    )
    expect(wrapper.find('[data-testid="tasks-empty"]').exists()).toBe(true)
  })

  it('hides management controls for viewers without manage rights', async () => {
    vi.mocked(listTasks).mockResolvedValue([makeTask()])

    const wrapper = mountSection({ canManage: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="task-create-form"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="task-status-t1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="task-deadline-t1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="task-delete-t1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="task-row-t1"]').exists()).toBe(true)
    expect(tryListUsers).not.toHaveBeenCalled()
  })
})
