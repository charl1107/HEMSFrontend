<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, Card, ConfirmDialog } from '@/components/ui'
import {
  addCommitteeMember,
  committeeMemberName,
  createCommittee,
  listCommittees,
  removeCommitteeMember,
  type CommitteeMemberRecord,
  type CommitteeRecord,
} from '../../../api/committees.api'
import { isRosterStatus } from '../../../api/events.api'
import { tryListUsers } from '../../../api/users.api'
import type { SafeUser } from '../../../api/auth.types'

const props = defineProps<{
  eventId: string
  status: string
  canManage: boolean
}>()

const committees = ref<CommitteeRecord[]>([])
const pickerUsers = ref<SafeUser[] | null>(null)
const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const createName = ref('')
const createDescription = ref('')
const memberDrafts = ref<Record<string, string>>({})

const rosterOpen = computed(() => isRosterStatus(props.status))
const showForm = computed(() => rosterOpen.value && props.canManage)
const hasPicker = computed(() => Boolean(pickerUsers.value?.length))

function draftFor(committeeId: string): string {
  return memberDrafts.value[committeeId] ?? ''
}

function setDraft(committeeId: string, value: string): void {
  memberDrafts.value = { ...memberDrafts.value, [committeeId]: value }
}

function canAddMember(committeeId: string): boolean {
  const draft = hasPicker.value
    ? draftFor(committeeId)
    : draftFor(committeeId).trim()
  return draft.length > 0
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

async function refresh(): Promise<void> {
  committees.value = await listCommittees(props.eventId)
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
    error.value = messageOf(err, 'Failed to load committees')
  } finally {
    loading.value = false
  }
}

async function onCreate(): Promise<void> {
  const name = createName.value.trim()
  if (!showForm.value || !name) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await createCommittee(props.eventId, {
      name,
      ...(createDescription.value.trim()
        ? { description: createDescription.value.trim() }
        : {}),
    })
    notice.value = 'Committee created.'
    createName.value = ''
    createDescription.value = ''
    await refresh()
  } catch (err) {
    error.value = messageOf(err, 'Failed to create committee')
  } finally {
    busy.value = false
  }
}

async function onAddMember(committee: CommitteeRecord): Promise<void> {
  if (!showForm.value || !canAddMember(committee.id)) return
  const userId = hasPicker.value
    ? draftFor(committee.id)
    : draftFor(committee.id).trim()
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await addCommitteeMember(props.eventId, committee.id, userId)
    notice.value = `Member added to ${committee.name}.`
    setDraft(committee.id, '')
    await refresh()
  } catch (err) {
    error.value = messageOf(err, 'Failed to add member')
  } finally {
    busy.value = false
  }
}

async function onRemoveMember(
  committee: CommitteeRecord,
  member: CommitteeMemberRecord,
): Promise<void> {
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await removeCommitteeMember(props.eventId, committee.id, member.userId)
    notice.value = `Member removed from ${committee.name}.`
    await refresh()
  } catch (err) {
    error.value = messageOf(err, 'Failed to remove member')
  } finally {
    busy.value = false
  }
}

const pendingMember = ref<{
  committee: CommitteeRecord
  member: CommitteeMemberRecord
} | null>(null)

function openDialog(
  committee: CommitteeRecord,
  member: CommitteeMemberRecord,
): void {
  pendingMember.value = { committee, member }
}

function cancelDialog(): void {
  pendingMember.value = null
}

async function confirmDialog(): Promise<void> {
  const pending = pendingMember.value
  pendingMember.value = null
  if (!pending) return
  await onRemoveMember(pending.committee, pending.member)
}

onMounted(load)
</script>

<template>
  <Card title="Committees" data-testid="committees-section">
    <p
      v-if="!rosterOpen"
      class="roster__gate"
      role="status"
      data-testid="committees-gated"
    >
      Committees are unavailable when the event status is {{ status }}.
    </p>
    <template v-else>
      <p v-if="loading">Loading…</p>
      <template v-else>
        <p
          v-if="error"
          class="roster__error"
          role="alert"
          data-testid="committees-error"
        >
          {{ error }}
        </p>
        <p
          v-if="notice"
          class="roster__notice"
          role="status"
          data-testid="committees-notice"
        >
          {{ notice }}
        </p>

        <form
          v-if="showForm"
          class="roster__form"
          data-testid="committee-create-form"
          @submit.prevent="onCreate"
        >
          <label class="roster__field">
            <span>Name *</span>
            <input
              v-model="createName"
              type="text"
              data-testid="committee-name"
              placeholder="Committee name"
            />
          </label>
          <label class="roster__field">
            <span>Description</span>
            <input
              v-model="createDescription"
              type="text"
              data-testid="committee-description"
              placeholder="Optional"
            />
          </label>
          <Button
            type="submit"
            :label="busy ? 'Saving…' : 'Create committee'"
            data-testid="committee-create"
            :disabled="busy || !createName.trim()"
          />
        </form>

        <div
          v-for="committee in committees"
          :key="committee.id"
          class="roster__committee"
          :data-testid="`committee-${committee.id}`"
        >
          <h3 class="roster__committee-title">{{ committee.name }}</h3>
          <p v-if="committee.description" class="roster__committee-desc">
            {{ committee.description }}
          </p>

          <ul class="roster__members">
            <li
              v-for="member in committee.members"
              :key="member.id"
              class="roster__member"
              :data-testid="`member-${member.id}`"
            >
              <span class="roster__member-name">{{ committeeMemberName(member) }}</span>
              <span class="roster__member-email">{{ member.user.email }}</span>
              <Button
                v-if="showForm"
                label="Remove"
                severity="secondary"
                :data-testid="`member-remove-${committee.id}-${member.userId}`"
                :disabled="busy"
                @click="openDialog(committee, member)"
              />
            </li>
            <li
              v-if="!committee.members.length"
              class="roster__member roster__member--empty"
              data-testid="committee-members-empty"
            >
              No members yet.
            </li>
          </ul>

          <form
            v-if="showForm"
            class="roster__add-member"
            :data-testid="`committee-add-member-${committee.id}`"
            @submit.prevent="onAddMember(committee)"
          >
            <label v-if="hasPicker" class="roster__field roster__field--inline">
              <span>User</span>
              <select
                :value="draftFor(committee.id)"
                :data-testid="`committee-member-select-${committee.id}`"
                @change="setDraft(committee.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="" disabled>Select a user…</option>
                <option v-for="user in pickerUsers" :key="user.id" :value="user.id">
                  {{ user.firstName }} {{ user.lastName }} ({{ user.email }})
                </option>
              </select>
            </label>
            <label v-else class="roster__field roster__field--inline">
              <span>User ID</span>
              <input
                type="text"
                :value="draftFor(committee.id)"
                :data-testid="`committee-member-input-${committee.id}`"
                placeholder="System user ID"
                @input="setDraft(committee.id, ($event.target as HTMLInputElement).value)"
              />
            </label>
            <Button
              type="submit"
              label="Add member"
              severity="secondary"
              :data-testid="`committee-member-add-${committee.id}`"
              :disabled="busy || !canAddMember(committee.id)"
            />
          </form>
        </div>

        <p
          v-if="!committees.length"
          class="roster__empty"
          data-testid="committees-empty"
        >
          No committees yet.
        </p>

        <ConfirmDialog
          :open="pendingMember !== null"
          title="Remove committee member"
          message="Remove this member from the committee? This cannot be undone."
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
.roster__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.roster__field--inline {
  /* 12rem basis + shrink: the row stays side-by-side while the select gives
     way on narrow screens instead of pushing the page sideways. */
  flex: 1 1 12rem;
  min-width: 0;
}
.roster__field--inline select,
.roster__field--inline input {
  width: 100%;
  min-width: 0;
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
.roster__committee {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
}
.roster__committee-title {
  margin: 0;
  font-size: 0.95rem;
}
.roster__committee-desc {
  margin: 0.25rem 0 0.5rem;
  color: var(--muted);
  font-size: 0.9em;
}
.roster__members {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0;
}
.roster__member {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--line);
}
.roster__member-name {
  color: var(--text-strong);
  font-weight: 500;
}
.roster__member-email {
  color: var(--muted);
  font-size: 0.9em;
}
.roster__member--empty {
  color: var(--muted);
}
.roster__add-member {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-end;
}
.roster__empty {
  margin: 0;
  color: var(--muted);
}
</style>
