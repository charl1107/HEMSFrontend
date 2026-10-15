<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Button, Card, ConfirmDialog, EventCard, Modal } from '@/components/ui'
import EventFormView from './EventFormView.vue'
import {
  advanceEvent,
  canTransition,
  EVENT_EDIT_ROLES,
  getEvent,
  isEditableStatus,
  resolveCoverSrc,
  type EventRecord,
  type EventStatus,
} from '../../../api/events.api'
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

const canEdit = computed(() =>
  Boolean(
    (isEditRole.value || isOwner.value) &&
      event.value &&
      isEditableStatus(event.value.status),
  ),
)

interface LifecycleAction {
  to: EventStatus
  label: string
  testid: string
  message: string
  notice: string
  destructive: boolean
}

/** Shown when canTransition(current, action.to) holds; copy names the target status. */
const LIFECYCLE_ACTIONS: LifecycleAction[] = [
  {
    to: 'Ongoing',
    label: 'Mark ongoing',
    testid: 'mark-ongoing',
    message: 'Mark this event as Ongoing?',
    notice: 'Event marked ongoing.',
    destructive: false,
  },
  {
    to: 'Completed',
    label: 'Mark completed',
    testid: 'mark-completed',
    message: 'Mark this event as Completed?',
    notice: 'Event marked completed.',
    destructive: false,
  },
  {
    to: 'Cancelled',
    label: 'Cancel event',
    testid: 'cancel-event',
    message: 'Cancel this event? Its status will become Cancelled.',
    notice: 'Event cancelled.',
    destructive: true,
  },
  {
    to: 'Planning',
    label: 'Resume event',
    testid: 'resume-event',
    message: 'Resume this event? Its status will return to Planning.',
    notice: 'Event resumed.',
    destructive: false,
  },
]

const canManageLifecycle = computed(() => isOwner.value || isEditRole.value)

const lifecycleActions = computed(() => {
  const current = event.value
  if (!current || !canManageLifecycle.value) return []
  return LIFECYCLE_ACTIONS.filter((action) =>
    canTransition(current.status, action.to),
  )
})

const advancing = ref(false)
const pendingAction = ref<LifecycleAction | null>(null)

const editOpen = ref(false)

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

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    event.value = await getEvent(eventId.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load event'
  } finally {
    loading.value = false
  }
}

async function onLifecycleConfirm(): Promise<void> {
  const action = pendingAction.value
  const current = event.value
  if (!action || !current) return
  advancing.value = true
  error.value = null
  notice.value = null
  try {
    event.value = await advanceEvent(current.id, action.to)
    notice.value = action.notice
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update event status'
  } finally {
    advancing.value = false
    pendingAction.value = null
  }
}

function onEdited(payload: { event: EventRecord }): void {
  event.value = payload.event
  notice.value = 'Event updated.'
  editOpen.value = false
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
            v-for="action in lifecycleActions"
            :key="action.to"
            :label="action.label"
            :severity="action.destructive ? 'danger' : 'primary'"
            :data-testid="action.testid"
            :disabled="advancing"
            @click="pendingAction = action"
          />
          <Button
            v-if="canEdit"
            label="Edit event"
            data-testid="edit-event"
            :disabled="advancing"
            @click="editOpen = true"
          />
        </div>
        <ConfirmDialog
          :open="pendingAction !== null"
          :title="pendingAction?.label ?? ''"
          :message="pendingAction?.message ?? ''"
          :confirm-label="pendingAction?.label ?? 'Confirm'"
          :destructive="pendingAction?.destructive ?? false"
          @confirm="onLifecycleConfirm"
          @cancel="pendingAction = null"
        />
      </Card>
    </template>

    <Modal
      :open="editOpen"
      title="Edit event"
      max-width="46rem"
      @close="editOpen = false"
    >
      <template v-if="event">
        <EventFormView
          overlay
          :edit-id="event.id"
          @submitted="onEdited"
          @cancel="editOpen = false"
        />
      </template>
    </Modal>
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
</style>
