<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, Card, ConfirmDialog } from '@/components/ui'
import {
  addParticipant,
  listParticipants,
  participantDisplayName,
  removeParticipant,
  type ParticipantRecord,
} from '../../../api/participants.api'
import { isRosterStatus } from '../../../api/events.api'
import { tryListUsers } from '../../../api/users.api'
import type { SafeUser } from '../../../api/auth.types'

const props = defineProps<{
  eventId: string
  status: string
  canManage: boolean
}>()

type AddMode = 'system' | 'external'
const ALL_STUDENTS_VALUE = '__all_students__'

const participants = ref<ParticipantRecord[]>([])
const pickerUsers = ref<SafeUser[] | null>(null)
const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const mode = ref<AddMode>('system')
const selectedUserId = ref('')
const manualUserId = ref('')
const participantType = ref<'Student' | 'Staff'>('Student')
const externalName = ref('')

const rosterOpen = computed(() => isRosterStatus(props.status))
const showForm = computed(() => rosterOpen.value && props.canManage)
const hasPicker = computed(() => Boolean(pickerUsers.value?.length))
const addedUserIds = computed(() => new Set(
  participants.value.flatMap((participant) => participant.userId ? [participant.userId] : []),
))
const studentsToAdd = computed(() =>
  (pickerUsers.value ?? []).filter(
    (user) => user.roles.includes('Student') && !addedUserIds.value.has(user.id),
  ),
)

const systemUserId = computed(() =>
  hasPicker.value ? selectedUserId.value : manualUserId.value.trim(),
)

const canSubmit = computed(() =>
  mode.value === 'external'
    ? externalName.value.trim().length > 0
    : systemUserId.value.length > 0,
)

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

async function refresh(): Promise<void> {
  participants.value = await listParticipants(props.eventId)
}

async function load(): Promise<void> {
  if (!rosterOpen.value) return
  loading.value = true
  error.value = null
  try {
    await refresh()
    if (props.canManage) {
      pickerUsers.value = await tryListUsers()
    }
  } catch (err) {
    error.value = messageOf(err, 'Failed to load participants')
  } finally {
    loading.value = false
  }
}

async function onSubmit(): Promise<void> {
  if (!showForm.value || !canSubmit.value) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    if (mode.value === 'system' && selectedUserId.value === ALL_STUDENTS_VALUE) {
      let addedCount = 0
      let failedCount = 0
      for (let index = 0; index < studentsToAdd.value.length; index += 10) {
        const batch = studentsToAdd.value.slice(index, index + 10)
        const results = await Promise.allSettled(
          batch.map((user) =>
            addParticipant(props.eventId, { userId: user.id, participantType: 'Student' }),
          ),
        )
        addedCount += results.filter((result) => result.status === 'fulfilled').length
        failedCount += results.filter((result) => result.status === 'rejected').length
      }
      notice.value = failedCount
        ? `Added ${addedCount} of ${studentsToAdd.value.length} students. Some could not be added.`
        : `Added ${addedCount} student${addedCount === 1 ? '' : 's'}.`
      selectedUserId.value = ''
      await refresh()
      return
    }

    const input =
      mode.value === 'external'
        ? { externalName: externalName.value.trim() }
        : { userId: systemUserId.value, participantType: participantType.value }
    await addParticipant(props.eventId, input)
    notice.value =
      mode.value === 'external' ? 'External guest added.' : 'Participant added.'
    mode.value = 'system'
    selectedUserId.value = ''
    manualUserId.value = ''
    externalName.value = ''
    participantType.value = 'Student'
    await refresh()
  } catch (err) {
    error.value = messageOf(err, 'Failed to add participant')
  } finally {
    busy.value = false
  }
}

async function onRemove(participant: ParticipantRecord): Promise<void> {
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await removeParticipant(props.eventId, participant.id)
    notice.value = 'Participant removed.'
    await refresh()
  } catch (err) {
    error.value = messageOf(err, 'Failed to remove participant')
  } finally {
    busy.value = false
  }
}

const pendingRemove = ref<ParticipantRecord | null>(null)

function openDialog(participant: ParticipantRecord): void {
  pendingRemove.value = participant
}

function cancelDialog(): void {
  pendingRemove.value = null
}

async function confirmDialog(): Promise<void> {
  const participant = pendingRemove.value
  pendingRemove.value = null
  if (!participant) return
  await onRemove(participant)
}

onMounted(load)
</script>

<template>
  <Card title="Participants" data-testid="participants-section">
    <p
      v-if="!rosterOpen"
      class="roster__gate"
      role="status"
      data-testid="participants-gated"
    >
      Participants open after the event is approved. Current status: {{ status }}.
    </p>
    <template v-else>
      <p v-if="loading">Loading…</p>
      <template v-else>
        <p
          v-if="error"
          class="roster__error"
          role="alert"
          data-testid="participants-error"
        >
          {{ error }}
        </p>
        <p
          v-if="notice"
          class="roster__notice"
          role="status"
          data-testid="participants-notice"
        >
          {{ notice }}
        </p>

        <form
          v-if="showForm"
          class="roster__form"
          data-testid="participant-add-form"
          @submit.prevent="onSubmit"
        >
          <fieldset class="roster__modes">
            <legend>Add participant</legend>
            <label>
              <input
                v-model="mode"
                type="radio"
                value="system"
                data-testid="participant-mode-system"
              />
              System user
            </label>
            <label>
              <input
                v-model="mode"
                type="radio"
                value="external"
                data-testid="participant-mode-external"
              />
              External guest
            </label>
          </fieldset>

          <template v-if="mode === 'system'">
            <label v-if="hasPicker" class="roster__field">
              <span>User</span>
              <select v-model="selectedUserId" data-testid="participant-user-select">
                <option value="" disabled>Select a user…</option>
                <option
                  v-if="studentsToAdd.length"
                  :value="ALL_STUDENTS_VALUE"
                  data-testid="participant-all-students"
                >
                  All students not yet added ({{ studentsToAdd.length }})
                </option>
                <option v-for="user in pickerUsers" :key="user.id" :value="user.id">
                  {{ user.firstName }} {{ user.lastName }} ({{ user.email }})
                </option>
              </select>
            </label>
            <label v-else class="roster__field">
              <span>User ID</span>
              <input
                v-model="manualUserId"
                type="text"
                data-testid="participant-user-id"
                placeholder="System user ID"
              />
              <span class="roster__hint">
                User directory unavailable — ask an Admin for the user ID.
              </span>
            </label>
            <label class="roster__field">
              <span>Type</span>
              <select
                v-model="participantType"
                data-testid="participant-type"
                :disabled="selectedUserId === ALL_STUDENTS_VALUE"
              >
                <option value="Student">Student</option>
                <option value="Staff">Staff</option>
              </select>
            </label>
          </template>
          <label v-else class="roster__field">
            <span>Guest name</span>
            <input
              v-model="externalName"
              type="text"
              data-testid="participant-external-name"
              placeholder="Full name"
            />
          </label>

          <Button
            type="submit"
            :label="busy ? 'Saving…' : selectedUserId === ALL_STUDENTS_VALUE ? 'Add all students' : 'Add participant'"
            data-testid="participant-add"
            :disabled="busy || !canSubmit"
          />
        </form>

        <div class="table-scroll">
          <table
            v-if="participants.length"
            class="roster__table"
            data-testid="participants-table"
          >
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Contact</th>
                <th v-if="showForm">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="participant in participants"
                :key="participant.id"
                :data-testid="`participant-row-${participant.id}`"
              >
                <td>{{ participantDisplayName(participant) }}</td>
                <td>{{ participant.participantType }}</td>
                <td>{{ participant.user?.email ?? '—' }}</td>
                <td v-if="showForm">
                  <Button
                    label="Remove"
                    severity="danger"
                    :data-testid="`participant-remove-${participant.id}`"
                    :disabled="busy"
                    @click="openDialog(participant)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else class="roster__empty" data-testid="participants-empty">
            No participants yet.
          </p>
        </div>

        <ConfirmDialog
          :open="pendingRemove !== null"
          title="Remove participant"
          message="Remove this participant from the event? This cannot be undone."
          confirm-label="Remove"
          cancel-label="Cancel"
          destructive
          @confirm="confirmDialog"
          @cancel="cancelDialog"
        />
      </template>
    </template>
  </Card>
</template>

<style scoped>
.roster__gate {
  margin: 0;
  color: var(--warn-text);
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
}
.roster__error {
  color: var(--danger-text);
  margin: 0 0 0.75rem;
}
.roster__notice {
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid var(--success-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
  margin: 0 0 0.75rem;
}
.roster__form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.roster__modes {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  display: flex;
  gap: 1rem;
  align-items: center;
}
.roster__modes label {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  font-size: 0.95em;
}
.roster__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.roster__field input,
.roster__field select {
  font: inherit;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text-strong);
  background: var(--surface);
}
.roster__hint {
  color: var(--muted);
  font-size: 0.85em;
}
.roster__table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.roster__table th,
.roster__table td {
  padding: 0.5rem;
  border-bottom: 1px solid var(--line);
}
.roster__empty {
  margin: 0;
  color: var(--muted);
}
</style>
