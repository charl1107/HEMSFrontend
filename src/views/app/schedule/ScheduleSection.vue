<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, Card } from '@/components/ui'
import { apiErrorMessage } from '../../../api/http'
import { isPlanningAllowedStatus } from '../../../api/events.api'
import {
  createSchedule,
  listSchedule,
  removeSchedule,
  scheduleTimesError,
  toIsoDateTime,
  updateSchedule,
  type ScheduleRecord,
} from '../../../api/schedule.api'

const props = defineProps<{
  eventId: string
  status: string
  canManage: boolean
}>()

const entries = ref<ScheduleRecord[]>([])
const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const notice = ref<string | null>(null)

const activityName = ref('')
const startTime = ref('')
const endTime = ref('')
const editingId = ref<string | null>(null)

const planningOpen = computed(() => isPlanningAllowedStatus(props.status))
const showForm = computed(() => planningOpen.value && props.canManage)
const formReady = computed(
  () =>
    activityName.value.trim().length > 0 &&
    startTime.value.length > 0 &&
    endTime.value.length > 0,
)

function toLocalInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString()
}

function clearForm(): void {
  activityName.value = ''
  startTime.value = ''
  endTime.value = ''
  editingId.value = null
  formError.value = null
}

async function refresh(): Promise<void> {
  entries.value = await listSchedule(props.eventId)
}

async function load(): Promise<void> {
  if (!planningOpen.value) return
  loading.value = true
  error.value = null
  try {
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to load schedule')
  } finally {
    loading.value = false
  }
}

async function onSubmit(): Promise<void> {
  if (!showForm.value || !formReady.value) return
  const timesError = scheduleTimesError(startTime.value, endTime.value)
  if (timesError) {
    error.value = null
    notice.value = null
    formError.value = timesError
    return
  }
  const payload = {
    activityName: activityName.value.trim(),
    startTime: toIsoDateTime(startTime.value),
    endTime: toIsoDateTime(endTime.value),
  }
  const editing = editingId.value
  busy.value = true
  error.value = null
  formError.value = null
  notice.value = null
  try {
    if (editing) {
      await updateSchedule(props.eventId, editing, payload)
      notice.value = 'Schedule entry updated.'
    } else {
      await createSchedule(props.eventId, payload)
      notice.value = 'Schedule entry added.'
    }
    clearForm()
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(
      err,
      editing ? 'Failed to update schedule entry' : 'Failed to add schedule entry',
    )
  } finally {
    busy.value = false
  }
}

function onStartEdit(entry: ScheduleRecord): void {
  if (!showForm.value) return
  editingId.value = entry.id
  activityName.value = entry.activityName
  startTime.value = toLocalInput(entry.startTime)
  endTime.value = toLocalInput(entry.endTime)
  error.value = null
  formError.value = null
  notice.value = null
}

function onCancelEdit(): void {
  clearForm()
  error.value = null
  notice.value = null
}

async function onDelete(entry: ScheduleRecord): Promise<void> {
  if (!showForm.value) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await removeSchedule(props.eventId, entry.id)
    notice.value = 'Schedule entry deleted.'
    if (editingId.value === entry.id) clearForm()
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to delete schedule entry')
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card title="Schedule" data-testid="schedule-section">
    <p
      v-if="!planningOpen"
      class="schedule__gate"
      role="status"
      data-testid="schedule-gated"
    >
      Schedule is unavailable when the event status is {{ status }}.
    </p>
    <template v-else>
      <p v-if="loading">Loading…</p>
      <template v-else>
        <p
          v-if="error"
          class="schedule__error"
          role="alert"
          data-testid="schedule-error"
        >
          {{ error }}
        </p>
        <p
          v-if="notice"
          class="schedule__notice"
          role="status"
          data-testid="schedule-notice"
        >
          {{ notice }}
        </p>

        <form
          v-if="showForm"
          class="schedule__form"
          data-testid="schedule-form"
          @submit.prevent="onSubmit"
        >
          <p
            v-if="formError"
            class="schedule__form-error"
            role="alert"
            data-testid="schedule-form-error"
          >
            {{ formError }}
          </p>
          <label class="schedule__field">
            <span>Activity *</span>
            <input
              v-model="activityName"
              type="text"
              data-testid="schedule-activity"
              placeholder="Activity name"
            />
          </label>
          <label class="schedule__field">
            <span>Starts *</span>
            <input v-model="startTime" type="datetime-local" data-testid="schedule-start" />
          </label>
          <label class="schedule__field">
            <span>Ends *</span>
            <input v-model="endTime" type="datetime-local" data-testid="schedule-end" />
          </label>
          <div class="schedule__actions">
            <Button
              type="submit"
              :label="
                busy
                  ? 'Saving…'
                  : editingId
                    ? 'Save changes'
                    : 'Add to schedule'
              "
              data-testid="schedule-save"
              :disabled="busy || !formReady"
            />
            <Button
              v-if="editingId"
              label="Cancel edit"
              severity="secondary"
              data-testid="schedule-cancel-edit"
              :disabled="busy"
              @click="onCancelEdit"
            />
          </div>
        </form>

        <ul
          v-if="entries.length"
          class="schedule__list"
          data-testid="schedule-list"
        >
          <li
            v-for="entry in entries"
            :key="entry.id"
            class="schedule__entry"
            :data-testid="`schedule-row-${entry.id}`"
          >
            <div class="schedule__entry-main">
              <span class="schedule__entry-name">{{ entry.activityName }}</span>
              <span class="schedule__entry-time">
                {{ formatDateTime(entry.startTime) }} →
                {{ formatDateTime(entry.endTime) }}
              </span>
            </div>
            <div v-if="showForm" class="schedule__entry-actions">
              <Button
                label="Edit"
                severity="secondary"
                :data-testid="`schedule-edit-${entry.id}`"
                :disabled="busy"
                @click="onStartEdit(entry)"
              />
              <Button
                label="Delete"
                severity="danger"
                :data-testid="`schedule-delete-${entry.id}`"
                :disabled="busy"
                @click="onDelete(entry)"
              />
            </div>
          </li>
        </ul>
        <p v-else class="schedule__empty" data-testid="schedule-empty">
          No schedule entries yet.
        </p>
      </template>
    </template>
  </Card>
</template>

<style scoped>
.schedule__gate {
  margin: 0;
  color: var(--warn-text);
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
}
.schedule__error {
  color: var(--danger-text);
  margin: 0 0 0.75rem;
}
.schedule__notice {
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid var(--success-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
  margin: 0 0 0.75rem;
}
.schedule__form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.schedule__form-error {
  color: var(--danger-strong);
  background: var(--danger-soft);
  border: 1px solid var(--danger-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
  margin: 0;
}
.schedule__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.schedule__field input {
  font: inherit;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text-strong);
  background: var(--surface);
}
.schedule__actions {
  display: flex;
  gap: 0.75rem;
}
.schedule__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.schedule__entry {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--line);
}
.schedule__entry-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.schedule__entry-name {
  color: var(--text-strong);
  font-weight: 500;
}
.schedule__entry-time {
  color: var(--muted);
  font-size: 0.9em;
}
.schedule__entry-actions {
  display: flex;
  gap: 0.5rem;
}
.schedule__empty {
  margin: 0;
  color: var(--muted);
}
</style>
