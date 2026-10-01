<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, Card } from '@/components/ui'
import { apiErrorMessage } from '../../../api/http'
import { isPlanningAllowedStatus } from '../../../api/events.api'
import {
  TASK_STATUSES,
  createTask,
  isTaskStatus,
  listTasks,
  removeTask,
  updateTask,
  type TaskRecord,
} from '../../../api/tasks.api'
import { tryListUsers } from '../../../api/users.api'
import type { SafeUser } from '../../../api/auth.types'

const props = defineProps<{
  eventId: string
  status: string
  canManage: boolean
}>()

const tasks = ref<TaskRecord[]>([])
const pickerUsers = ref<SafeUser[] | null>(null)
const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const createTitle = ref('')
const createDescription = ref('')
const createDeadline = ref('')
const createAssignee = ref('')

const planningOpen = computed(() => isPlanningAllowedStatus(props.status))
const showForm = computed(() => planningOpen.value && props.canManage)
const hasPicker = computed(() => Boolean(pickerUsers.value?.length))
const createReady = computed(
  () => createTitle.value.trim().length > 0 && createDeadline.value.length > 0,
)

function createAssigneeValue(): string {
  return hasPicker.value ? createAssignee.value : createAssignee.value.trim()
}

function rowAssigneeValue(event: Event): string {
  return (event.target as HTMLSelectElement | HTMLInputElement).value.trim()
}

async function refresh(): Promise<void> {
  tasks.value = await listTasks(props.eventId)
}

async function load(): Promise<void> {
  if (!planningOpen.value) return
  loading.value = true
  error.value = null
  try {
    await refresh()
    if (props.canManage) {
      pickerUsers.value = await tryListUsers()
    }
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to load tasks')
  } finally {
    loading.value = false
  }
}

async function onCreate(): Promise<void> {
  if (!showForm.value || !createReady.value) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    const description = createDescription.value.trim()
    await createTask(props.eventId, {
      title: createTitle.value.trim(),
      deadline: new Date(createDeadline.value).toISOString(),
      assignedToUserId: createAssigneeValue() || null,
      ...(description ? { description } : {}),
    })
    notice.value = 'Task created.'
    createTitle.value = ''
    createDescription.value = ''
    createDeadline.value = ''
    createAssignee.value = ''
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to create task')
  } finally {
    busy.value = false
  }
}

async function onStatusChange(task: TaskRecord, event: Event): Promise<void> {
  const value = (event.target as HTMLSelectElement).value
  if (!showForm.value || !isTaskStatus(value) || value === task.status) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await updateTask(props.eventId, task.id, { status: value })
    notice.value = 'Task status updated.'
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to update task status')
  } finally {
    busy.value = false
  }
}

async function onAssignChange(task: TaskRecord, event: Event): Promise<void> {
  const value = rowAssigneeValue(event)
  if (!showForm.value || value === (task.assignedToUserId ?? '')) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await updateTask(props.eventId, task.id, {
      assignedToUserId: value || null,
    })
    notice.value = 'Task assignee updated.'
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to update assignee')
  } finally {
    busy.value = false
  }
}

async function onDeadlineChange(task: TaskRecord, event: Event): Promise<void> {
  const value = (event.target as HTMLInputElement).value
  if (!showForm.value || !value || value === task.deadline.slice(0, 10)) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await updateTask(props.eventId, task.id, {
      deadline: new Date(value).toISOString(),
    })
    notice.value = 'Task deadline updated.'
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to update deadline')
  } finally {
    busy.value = false
  }
}

async function onDelete(task: TaskRecord): Promise<void> {
  if (!showForm.value) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await removeTask(props.eventId, task.id)
    notice.value = 'Task deleted.'
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to delete task')
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card title="Tasks" data-testid="tasks-section">
    <p
      v-if="!planningOpen"
      class="tasks__gate"
      role="status"
      data-testid="tasks-gated"
    >
      Tasks are unavailable when the event status is {{ status }}.
    </p>
    <template v-else>
      <p v-if="loading">Loading…</p>
      <template v-else>
        <p
          v-if="error"
          class="tasks__error"
          role="alert"
          data-testid="tasks-error"
        >
          {{ error }}
        </p>
        <p
          v-if="notice"
          class="tasks__notice"
          role="status"
          data-testid="tasks-notice"
        >
          {{ notice }}
        </p>

        <form
          v-if="showForm"
          class="tasks__form"
          data-testid="task-create-form"
          @submit.prevent="onCreate"
        >
          <label class="tasks__field">
            <span>Title *</span>
            <input
              v-model="createTitle"
              type="text"
              data-testid="task-title"
              placeholder="Task title"
            />
          </label>
          <label class="tasks__field">
            <span>Description</span>
            <input
              v-model="createDescription"
              type="text"
              data-testid="task-description"
              placeholder="Optional"
            />
          </label>
          <label class="tasks__field">
            <span>Deadline *</span>
            <input v-model="createDeadline" type="date" data-testid="task-deadline" />
          </label>
          <label v-if="hasPicker" class="tasks__field">
            <span>Assignee</span>
            <select v-model="createAssignee" data-testid="task-assign-select">
              <option value="">Unassigned</option>
              <option v-for="user in pickerUsers" :key="user.id" :value="user.id">
                {{ user.firstName }} {{ user.lastName }} ({{ user.email }})
              </option>
            </select>
          </label>
          <label v-else class="tasks__field">
            <span>Assignee user ID</span>
            <input
              v-model="createAssignee"
              type="text"
              data-testid="task-assign-input"
              placeholder="Leave empty for unassigned"
            />
            <span class="tasks__hint">
              User directory unavailable — paste a user ID or leave empty.
            </span>
          </label>
          <Button
            type="submit"
            :label="busy ? 'Saving…' : 'Create task'"
            data-testid="task-create"
            :disabled="busy || !createReady"
          />
        </form>

        <div class="table-scroll">
          <table
            v-if="tasks.length"
            class="tasks__table"
            data-testid="tasks-table"
          >
            <thead>
              <tr>
                <th>Task</th>
                <th>Assignee</th>
                <th>Deadline</th>
                <th>Status</th>
                <th v-if="showForm">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="task in tasks"
                :key="task.id"
                :data-testid="`task-row-${task.id}`"
              >
                <td class="tasks__cell">
                  <span class="tasks__title">{{ task.title }}</span>
                  <span v-if="task.description" class="tasks__desc">
                    {{ task.description }}
                  </span>
                </td>
                <td>
                  <template v-if="showForm">
                    <select
                      v-if="hasPicker"
                      :value="task.assignedToUserId ?? ''"
                      :data-testid="`task-assign-${task.id}`"
                      :disabled="busy"
                      @change="onAssignChange(task, $event)"
                    >
                      <option value="">Unassigned</option>
                      <option
                        v-for="user in pickerUsers"
                        :key="user.id"
                        :value="user.id"
                      >
                        {{ user.firstName }} {{ user.lastName }}
                      </option>
                    </select>
                    <input
                      v-else
                      type="text"
                      :value="task.assignedToUserId ?? ''"
                      :data-testid="`task-assign-${task.id}`"
                      :disabled="busy"
                      placeholder="User ID"
                      @change="onAssignChange(task, $event)"
                    />
                  </template>
                  <template v-else>
                    {{
                      task.assignedToUser
                        ? `${task.assignedToUser.firstName} ${task.assignedToUser.lastName}`
                        : 'Unassigned'
                    }}
                  </template>
                </td>
                <td>
                  <input
                    v-if="showForm"
                    type="date"
                    :value="task.deadline.slice(0, 10)"
                    :data-testid="`task-deadline-${task.id}`"
                    :disabled="busy"
                    @change="onDeadlineChange(task, $event)"
                  />
                  <template v-else>{{ task.deadline.slice(0, 10) }}</template>
                </td>
                <td>
                  <select
                    v-if="showForm"
                    :value="task.status"
                    :data-testid="`task-status-${task.id}`"
                    :disabled="busy"
                    @change="onStatusChange(task, $event)"
                  >
                    <option v-for="option in TASK_STATUSES" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </select>
                  <template v-else>{{ task.status }}</template>
                </td>
                <td v-if="showForm">
                  <Button
                    label="Delete"
                    severity="danger"
                    :data-testid="`task-delete-${task.id}`"
                    :disabled="busy"
                    @click="onDelete(task)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="tasks__empty" data-testid="tasks-empty">
            No tasks yet.
          </p>
        </div>
      </template>
    </template>
  </Card>
</template>

<style scoped>
.tasks__gate {
  margin: 0;
  color: var(--warn-text);
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
}
.tasks__error {
  color: var(--danger-text);
  margin: 0 0 0.75rem;
}
.tasks__notice {
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid var(--success-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
  margin: 0 0 0.75rem;
}
.tasks__form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.tasks__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.tasks__field input,
.tasks__field select {
  font: inherit;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text-strong);
  background: var(--surface);
}
.tasks__hint {
  color: var(--muted);
  font-size: 0.85em;
}
.tasks__table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.tasks__table th,
.tasks__table td {
  padding: 0.5rem;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
.tasks__table select,
.tasks__table input {
  font: inherit;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text-strong);
  background: var(--surface);
  max-width: 100%;
}
.tasks__cell {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.tasks__title {
  color: var(--text-strong);
  font-weight: 500;
}
.tasks__desc {
  color: var(--muted);
  font-size: 0.9em;
}
.tasks__empty {
  margin: 0;
  color: var(--muted);
}
</style>
