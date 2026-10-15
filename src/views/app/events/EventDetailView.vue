<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Button, Card, ConfirmDialog, EventCard } from '@/components/ui'
import {
  advanceEvent,
  EVENT_EDIT_ROLES,
  getEvent,
  isEditableStatus,
  isRosterStatus,
  resolveCoverSrc,
  type EventAdvanceTarget,
  type EventRecord,
} from '../../../api/events.api'
import { COMMITTEE_MANAGER_ROLES, listCommittees } from '../../../api/committees.api'
import CommitteesSection from '../committees/CommitteesSection.vue'
import TasksSection from '../tasks/TasksSection.vue'
import ScheduleSection from '../schedule/ScheduleSection.vue'
import DocumentsSection from '../documents/DocumentsSection.vue'
import { useAuthStore } from '../../../stores/auth.store'

const route = useRoute()
const auth = useAuthStore()

const eventId = computed(() => String(route.params.id))
const event = ref<EventRecord | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const isEditRole = computed(() =>
  EVENT_EDIT_ROLES.some((role) => auth.roles.includes(role)),
)

const isOwner = computed(() =>
  Boolean(event.value && auth.user && event.value.createdById === auth.user.id),
)

const isCommitteeManagerRole = computed(() =>
  COMMITTEE_MANAGER_ROLES.some((role) => auth.roles.includes(role)),
)

const isCommitteeMember = ref(false)

const canEdit = computed(() =>
  Boolean(
    (isEditRole.value || isOwner.value) &&
      event.value &&
      isEditableStatus(event.value.status),
  ),
)

const canManageCommittees = computed(
  () => isOwner.value || isCommitteeManagerRole.value,
)

const canManagePlanning = computed(
  () => isOwner.value || isCommitteeMember.value || isCommitteeManagerRole.value,
)

/** Lifecycle advance (POST /events/:id/advance) — owner-only in this view. */
const canAdvanceToOngoing = computed(
  () => isOwner.value && event.value?.status === 'Planning',
)

const canAdvanceToCompleted = computed(
  () => isOwner.value && event.value?.status === 'Ongoing',
)

const advancing = ref(false)
const pendingAdvance = ref<EventAdvanceTarget | null>(null)

const pendingAdvanceTitle = computed(() =>
  pendingAdvance.value === 'Completed' ? 'Mark completed' : 'Mark ongoing',
)

const pendingAdvanceMessage = computed(() =>
  pendingAdvance.value === 'Completed'
    ? 'Mark this event as completed?'
    : 'Mark this event as ongoing?',
)

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

async function resolveCommitteeMembership(): Promise<void> {
  isCommitteeMember.value = false
  const current = event.value
  if (!current || !auth.user) return
  if (current.createdById === auth.user.id) return
  if (isCommitteeManagerRole.value) return
  if (!isRosterStatus(current.status)) return
  try {
    const committees = await listCommittees(current.id)
    isCommitteeMember.value = committees.some((committee) =>
      committee.members.some((member) => member.userId === auth.user!.id),
    )
  } catch {
    isCommitteeMember.value = false
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    event.value = await getEvent(eventId.value)
    await resolveCommitteeMembership()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load event'
  } finally {
    loading.value = false
  }
}

async function onAdvanceConfirm(): Promise<void> {
  const to = pendingAdvance.value
  if (!to || !event.value) return
  advancing.value = true
  error.value = null
  notice.value = null
  try {
    event.value = await advanceEvent(event.value.id, to)
    notice.value =
      to === 'Ongoing' ? 'Event marked ongoing.' : 'Event marked completed.'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to advance event'
  } finally {
    advancing.value = false
    pendingAdvance.value = null
  }
}

onMounted(load)
</script>

<template>
  <main class="event-detail" data-testid="event-detail">
    <div class="event-detail__header">
      <h1>Event detail</h1>
      <RouterLink :to="{ name: 'events-list' }" data-testid="back-to-events">
        ← Back to events
      </RouterLink>
    </div>

    <p v-if="loading">Loading…</p>
    <p
      v-else-if="error"
      class="event-detail__error"
      role="alert"
      data-testid="event-detail-error"
    >
      {{ error }}
    </p>
    <template v-else-if="event">
      <p
        v-if="notice"
        class="event-detail__notice"
        role="status"
        data-testid="event-detail-notice"
      >
        {{ notice }}
      </p>

      <Card>
        <EventCard
          :title="event.title"
          :event-date="event.eventDate"
          :venue="event.venue"
          :department="event.department"
          :campus-scope="event.campusScope"
          :status="event.status"
          :cover-src="resolveCoverSrc(event.coverImageUrl)"
        />
        <section class="event-detail__meta">
          <span>{{ formatDate(event.eventDate) }}</span>
          <span v-if="event.eventType">{{ event.eventType.name }}</span>
          <span><strong>Venue:</strong> {{ event.venue }}</span>
        </section>
        <p
          v-if="event.description"
          class="event-detail__description"
          data-testid="event-description"
        >
          {{ event.description }}
        </p>
        <p v-else class="event-detail__description event-detail__description--empty">
          No description provided.
        </p>

        <div class="event-detail__actions">
          <Button
            v-if="canAdvanceToOngoing"
            label="Mark ongoing"
            data-testid="mark-ongoing"
            :disabled="advancing"
            @click="pendingAdvance = 'Ongoing'"
          />
          <Button
            v-if="canAdvanceToCompleted"
            label="Mark completed"
            data-testid="mark-completed"
            :disabled="advancing"
            @click="pendingAdvance = 'Completed'"
          />
          <RouterLink
            v-if="canEdit"
            :to="{ name: 'event-edit', params: { id: event.id } }"
            data-testid="edit-event-link"
          >
            Edit event
          </RouterLink>
        </div>
        <ConfirmDialog
          :open="pendingAdvance !== null"
          :title="pendingAdvanceTitle"
          :message="pendingAdvanceMessage"
          :confirm-label="pendingAdvanceTitle"
          @confirm="onAdvanceConfirm"
          @cancel="pendingAdvance = null"
        />
      </Card>

      <CommitteesSection
        :event-id="event.id"
        :status="event.status"
        :can-manage="canManageCommittees"
      />
      <TasksSection
        :event-id="event.id"
        :status="event.status"
        :can-manage="canManagePlanning"
      />
      <ScheduleSection
        :event-id="event.id"
        :status="event.status"
        :can-manage="canManagePlanning"
      />
      <DocumentsSection
        :event-id="event.id"
        :status="event.status"
        :can-manage="canManagePlanning"
      />
    </template>
  </main>
</template>

<style scoped>
.event-detail {
  padding: 1.5rem;
  max-width: 720px;
  width: 100%;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.event-detail__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}
.event-detail__header h1 {
  margin: 0;
  font-size: 1.35rem;
}
.event-detail__error {
  color: var(--danger-text);
  margin: 0;
}
.event-detail__notice {
  margin: 0;
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid var(--success-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
}
.event-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.75rem;
  color: var(--muted);
  font-size: 0.95em;
}
.event-detail__description {
  margin: 0.75rem 0 0;
  color: var(--gray-700);
}
.event-detail__description--empty {
  color: var(--muted);
}
.event-detail__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}
.event-detail__actions a {
  color: var(--accent-text);
  font-weight: 500;
}
</style>
