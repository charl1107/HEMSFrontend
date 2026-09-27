<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Button,
  Card,
  ConflictOverrideModal,
  DataTable,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui'
import { useAuthStore } from '../../../stores/auth.store'
import EventFormView from '../events/EventFormView.vue'
import {
  approveEvent,
  listPendingApprovals,
  parseApprovalConflict,
  rejectEvent,
  requestRevision,
  type ConflictHit,
  type PendingApprovalRecord,
} from '../../../api/approvals.api'
import {
  resolveCoverSrc,
  REVIEW_EVENT_ROLES,
  SUBMIT_EVENT_ROLES,
  type EventRecord,
} from '../../../api/events.api'

type DialogKind = 'approve' | 'reject' | 'revision'

const auth = useAuthStore()

const canSubmit = computed(() =>
  SUBMIT_EVENT_ROLES.some((role) => auth.roles.includes(role)),
)
const canReview = computed(() =>
  REVIEW_EVENT_ROLES.some((role) => auth.roles.includes(role)),
)

const items = ref<PendingApprovalRecord[]>([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const PAGE_SIZE = 50

const formOpen = ref(false)

const dialogKind = ref<DialogKind | null>(null)
const dialogEvent = ref<PendingApprovalRecord | null>(null)
const dialogComment = ref('')

const overrideOpen = ref(false)
const overrideEvent = ref<PendingApprovalRecord | null>(null)
const overrideConflict = ref<ConflictHit | null>(null)
const overrideMessage = ref('')
const overrideComments = ref<string | undefined>(undefined)

const columns: DataTableColumn[] = [
  { key: 'cover', header: 'Cover', field: 'coverImageUrl' },
  { key: 'title', header: 'Title', field: 'title' },
  { key: 'eventDate', header: 'Date', field: 'eventDate' },
  { key: 'venue', header: 'Venue', field: 'venue' },
  { key: 'status', header: 'Status' },
  { key: 'comment', header: 'Latest comment' },
  { key: 'actions', header: 'Actions' },
]

const dialogTitle = computed(() => {
  const title = dialogEvent.value?.title ?? ''
  switch (dialogKind.value) {
    case 'approve':
      return `Approve "${title}"`
    case 'reject':
      return `Reject "${title}"`
    case 'revision':
      return `Request revision — "${title}"`
    default:
      return ''
  }
})

const dialogRequiresComment = computed(
  () => dialogKind.value === 'reject' || dialogKind.value === 'revision',
)

const dialogConfirmLabel = computed(() => {
  switch (dialogKind.value) {
    case 'approve':
      return 'Approve'
    case 'reject':
      return 'Reject'
    case 'revision':
      return 'Request revision'
    default:
      return 'Confirm'
  }
})

const dialogInputLabel = computed(() => {
  if (dialogKind.value === 'reject') return 'Reason *'
  if (dialogKind.value === 'revision') return 'Comments *'
  return 'Comments (optional)'
})

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong'
}

async function load(reset = true): Promise<void> {
  if (reset) {
    loading.value = true
    error.value = null
  } else {
    loadingMore.value = true
  }
  try {
    const page = await listPendingApprovals({
      limit: PAGE_SIZE,
      offset: reset ? 0 : items.value.length,
    })
    items.value = reset ? page.items : [...items.value, ...page.items]
    total.value = page.total
  } catch (err) {
    error.value = messageOf(err)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function openDialog(kind: DialogKind, event: PendingApprovalRecord): void {
  dialogKind.value = kind
  dialogEvent.value = event
  dialogComment.value = ''
  error.value = null
  notice.value = null
}

function closeDialog(): void {
  dialogKind.value = null
  dialogEvent.value = null
  dialogComment.value = ''
}

function cancelOverride(): void {
  overrideOpen.value = false
  overrideEvent.value = null
  overrideConflict.value = null
  overrideMessage.value = ''
  overrideComments.value = undefined
}

async function performApprove(
  event: PendingApprovalRecord,
  comments: string | undefined,
  override: boolean,
): Promise<void> {
  try {
    const result = await approveEvent(event.id, {
      ...(comments ? { comments } : {}),
      ...(override ? { overrideConflict: true } : {}),
    })
    overrideOpen.value = false
    overrideEvent.value = null
    overrideConflict.value = null
    notice.value = result.conflictWarning
      ? `Approved with conflict override. ${result.conflictWarning}`
      : 'Event approved and moved to Planning.'
    await load()
  } catch (err) {
    const conflict = override ? null : parseApprovalConflict(err)
    if (conflict) {
      overrideEvent.value = event
      overrideConflict.value = conflict.conflict
      overrideMessage.value = conflict.message
      overrideComments.value = comments
      overrideOpen.value = true
      return
    }
    throw err
  }
}

async function confirmDialog(): Promise<void> {
  const event = dialogEvent.value
  const kind = dialogKind.value
  if (!event || !kind) return
  const comment = dialogComment.value.trim()
  if (dialogRequiresComment.value && !comment) {
    error.value = kind === 'reject' ? 'A reason is required.' : 'Comments are required.'
    return
  }

  busy.value = true
  error.value = null
  try {
    if (kind === 'approve') {
      await performApprove(event, comment || undefined, false)
      closeDialog()
    } else if (kind === 'reject') {
      await rejectEvent(event.id, comment)
      closeDialog()
      notice.value = 'Event rejected.'
      await load()
    } else {
      await requestRevision(event.id, comment)
      closeDialog()
      notice.value = 'Revision requested.'
      await load()
    }
  } catch (err) {
    error.value = messageOf(err)
  } finally {
    busy.value = false
  }
}

async function confirmOverride(): Promise<void> {
  const event = overrideEvent.value
  if (!event) return
  busy.value = true
  error.value = null
  try {
    await performApprove(event, overrideComments.value, true)
    cancelOverride()
  } catch (err) {
    error.value = messageOf(err)
  } finally {
    busy.value = false
  }
}

function coverSrc(event: PendingApprovalRecord): string | null {
  return resolveCoverSrc(event.coverImageUrl)
}

function openCreateForm(): void {
  error.value = null
  notice.value = null
  formOpen.value = true
}

function closeCreateForm(): void {
  formOpen.value = false
}

async function onFormSubmitted(payload: {
  event: EventRecord
  conflictWarning: string | null
  coverError: string | null
}): Promise<void> {
  formOpen.value = false
  const parts = [
    `Submitted for approval — "${payload.event.title}" is now in the review queue.`,
  ]
  if (payload.conflictWarning) parts.push(payload.conflictWarning)
  if (payload.coverError) {
    parts.push(`Cover image was not uploaded: ${payload.coverError}`)
  }
  notice.value = parts.join(' ')
  error.value = null
  await load()
}

function latestComment(event: PendingApprovalRecord): string {
  return event.approvals[0]?.comments ?? '—'
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

onMounted(load)
</script>

<template>
  <main class="approvals" data-testid="approval-queue">
    <div class="approvals__header">
      <h1>Event review queue</h1>
      <Button
        v-if="canSubmit"
        label="Create event"
        class="approvals__create"
        data-testid="create-event"
        @click="openCreateForm"
      />
    </div>

    <Card>
      <p v-if="loading">Loading…</p>
      <p
        v-else-if="error && !items.length"
        class="approvals__error"
        role="alert"
        data-testid="approvals-error"
      >
        {{ error }}
      </p>
      <template v-else>
        <p
          v-if="notice"
          class="approvals__notice"
          role="status"
          data-testid="approvals-notice"
        >
          {{ notice }}
        </p>
        <p v-if="error" class="approvals__error" role="alert" data-testid="approvals-error">
          {{ error }}
        </p>
        <DataTable
          :columns="columns"
          :rows="items"
          data-key="id"
          striped
          paginator
          :page-size="10"
          data-testid="approvals-table"
        >
          <template #cell="{ row, column }">
            <template v-if="column.key === 'cover'">
              <img
                v-if="coverSrc(row)"
                class="approvals__cover"
                :src="coverSrc(row)!"
                alt=""
                :data-testid="`cover-thumb-${row.id}`"
              />
              <span
                v-else
                class="approvals__cover-placeholder"
                aria-hidden="true"
                :data-testid="`cover-placeholder-${row.id}`"
              >
                No cover
              </span>
            </template>
            <template v-else-if="column.key === 'title'">{{ row.title }}</template>
            <template v-else-if="column.key === 'eventDate'">
              {{ formatDate(row.eventDate) }}
            </template>
            <template v-else-if="column.key === 'venue'">{{ row.venue }}</template>
            <template v-else-if="column.key === 'status'">
              <StatusBadge :status="row.status" />
            </template>
            <template v-else-if="column.key === 'comment'">
              {{ latestComment(row) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="approvals__actions">
                <template v-if="canReview">
                  <Button
                    label="Approve"
                    :data-testid="`approve-${row.id}`"
                    :disabled="busy"
                    @click="openDialog('approve', row)"
                  />
                  <Button
                    label="Reject"
                    severity="danger"
                    :data-testid="`reject-${row.id}`"
                    :disabled="busy"
                    @click="openDialog('reject', row)"
                  />
                  <Button
                    label="Request revision"
                    severity="secondary"
                    :data-testid="`revision-${row.id}`"
                    :disabled="busy"
                    @click="openDialog('revision', row)"
                  />
                </template>
                <RouterLink
                  :to="{ name: 'event-detail', params: { id: row.id } }"
                  :data-testid="`view-approval-${row.id}`"
                >
                  View
                </RouterLink>
              </div>
            </template>
          </template>
          <template #empty>
            <p data-testid="approvals-empty">No proposals are waiting for approval.</p>
          </template>
        </DataTable>
        <button
          v-if="items.length < total"
          type="button"
          class="approvals__load-more"
          data-testid="load-more-approvals"
          :disabled="loadingMore"
          @click="load(false)"
        >
          {{ loadingMore ? 'Loading…' : `Load more (${items.length} of ${total})` }}
        </button>
      </template>
    </Card>

    <div
      v-if="dialogKind"
      class="approvals__overlay"
      @click.self="!busy && closeDialog()"
    >
      <div
        class="approvals__dialog"
        role="dialog"
        aria-modal="true"
        data-testid="approval-dialog"
      >
        <h2 class="approvals__dialog-title">{{ dialogTitle }}</h2>
        <label class="approvals__dialog-field">
          <span>{{ dialogInputLabel }}</span>
          <textarea
            v-model="dialogComment"
            rows="3"
            data-testid="approval-dialog-input"
            :disabled="busy"
          />
        </label>
        <p
          v-if="error"
          class="approvals__error"
          role="alert"
          data-testid="approval-dialog-error"
        >
          {{ error }}
        </p>
        <div class="approvals__dialog-actions">
          <Button
            label="Cancel"
            severity="secondary"
            data-testid="approval-dialog-cancel"
            :disabled="busy"
            @click="closeDialog"
          />
          <Button
            :label="dialogConfirmLabel"
            :severity="dialogKind === 'reject' ? 'danger' : 'primary'"
            data-testid="approval-dialog-confirm"
            :disabled="
              busy || (dialogRequiresComment && !dialogComment.trim())
            "
            @click="confirmDialog"
          />
        </div>
      </div>
    </div>

    <ConflictOverrideModal
      v-if="overrideOpen && overrideConflict"
      :message="overrideMessage"
      :conflict-title="overrideConflict.title"
      :conflict-venue="overrideConflict.venue"
      :conflict-date="overrideConflict.eventDate"
      :busy="busy"
      @confirm="confirmOverride"
      @cancel="cancelOverride"
    />

    <div v-if="formOpen" class="approvals__overlay" data-testid="create-event-overlay">
      <div
        class="approvals__dialog approvals__dialog--form"
        role="dialog"
        aria-modal="true"
        data-testid="create-event-dialog"
      >
        <h2 class="approvals__dialog-title">Create event</h2>
        <EventFormView
          overlay
          @submitted="onFormSubmitted"
          @cancel="closeCreateForm"
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
.approvals {
  padding: 1.5rem;
  background: linear-gradient(180deg, var(--snow) 0%, var(--page) 100%);
}
.approvals__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  min-height: 2.9rem;
}
.approvals__header h1 {
  margin: 0 0 1rem;
  font-size: clamp(1.8rem, 2vw, 2.3rem);
  color: var(--ink);
}
.approvals__create.ui-button {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand-strong-btn) 0%, var(--brand-btn) 100%);
  color: #fff;
  font-weight: 700;
  text-decoration: none;
}
.approvals__create.ui-button:hover {
  transform: translateY(-1px);
}
.approvals__create.ui-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(219, 39, 119, 0.18);
}
.approvals__error {
  color: var(--danger-text);
  margin: 0 0 0.75rem;
}
.approvals__notice {
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid var(--success-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
  margin: 0 0 0.75rem;
}
.approvals__load-more {
  display: block;
  margin: 1rem auto 0;
  padding: 0.55rem 1.4rem;
  font: inherit;
  font-weight: 600;
  color: var(--muted-plum);
  background: var(--surface);
  border: 1px solid var(--pink-line);
  border-radius: 999px;
  cursor: pointer;
}
.approvals__load-more:hover:enabled {
  background: var(--rose-soft);
  color: var(--brand-text);
}
.approvals__load-more:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}
.approvals__load-more:disabled {
  opacity: 0.6;
  cursor: default;
}
.approvals__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.approvals__actions a {
  color: var(--accent-text);
  font-weight: 500;
}
.approvals__overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 40;
}
.approvals__dialog {
  background: var(--surface);
  border-radius: 10px;
  padding: 1.25rem;
  max-width: 460px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
}
.approvals__dialog-title {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
  color: var(--text-strong);
}
.approvals__dialog--form {
  max-width: 44rem;
  max-height: calc(100vh - 3rem);
  overflow-y: auto;
}
.approvals__cover {
  display: block;
  width: 64px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.approvals__cover-placeholder {
  display: inline-block;
  width: 64px;
  text-align: center;
  font-size: 0.7rem;
  color: var(--gray-400);
  border: 1px dashed var(--line);
  border-radius: 6px;
  padding: 0.55rem 0;
}
.approvals__dialog-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}
.approvals__dialog-field textarea {
  font: inherit;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text-strong);
  background: var(--surface);
  resize: vertical;
}
.approvals__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
@media (max-width: 640px) {
  .approvals {
    padding: 1rem;
  }

  .approvals__header {
    align-items: flex-start;
    flex-direction: column;
    min-height: 6rem;
  }

  .approvals__create.ui-button {
    position: static;
    align-self: flex-start;
    width: auto;
    min-width: 10rem;
    justify-content: center;
    padding: 0.6rem 1.1rem;
  }

  .approvals :deep(.ui-table-wrap[data-testid='approvals-table']) {
    overflow: visible;
  }

  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table),
  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody) {
    display: block;
    width: 100%;
  }

  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table thead) {
    display: none;
  }

  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody tr) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 0.8rem;
    margin-bottom: 0.75rem;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    background: var(--surface);
  }

  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td) {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
    padding: 0.5rem 0;
    overflow-wrap: anywhere;
    border-bottom: 1px solid var(--line);
  }

  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td::before) {
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 600;
  }

  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td:nth-child(1)::before) { content: 'Cover'; }
  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td:nth-child(2)::before) { content: 'Title'; }
  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td:nth-child(3)::before) { content: 'Date'; }
  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td:nth-child(4)::before) { content: 'Venue'; }
  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td:nth-child(5)::before) { content: 'Status'; }
  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td:nth-child(6)::before) { content: 'Latest comment'; }
  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td:nth-child(7)::before) { content: 'Actions'; }

  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td:nth-child(2)),
  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td:nth-child(4)),
  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td:nth-child(6)),
  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td:nth-child(7)) {
    grid-column: 1 / -1;
  }

  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td[colspan]) {
    display: block;
    grid-column: 1 / -1;
    border-bottom: 0;
  }

  .approvals :deep(.ui-table-wrap[data-testid='approvals-table'] .ui-table tbody td[colspan]::before) {
    content: none;
  }

  .approvals__actions { gap: 0.45rem; }
}
</style>
