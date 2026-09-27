<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EventCard, StatusBadge } from '@/components/ui'
import { getPublicEvent, resolveCoverSrc, type EventRecord } from '../../api/events.api'
import { listSchedule, type ScheduleRecord } from '../../api/schedule.api'

const route = useRoute()
const router = useRouter()

const event = ref<EventRecord | null>(null)
const schedule = ref<ScheduleRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

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

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return isoString
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  const id = String(route.params.id)
  loading.value = true
  error.value = null
  try {
    event.value = await getPublicEvent(id)
    try {
      schedule.value = await listSchedule(id)
    } catch {
      // Schedule is optional for public viewing
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Event not found'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="public-event-detail" data-testid="public-event-detail">
    <button type="button" class="public-event-detail__back" data-testid="back-to-list" @click="router.push({ name: 'public-events' })">
      ← Back to events
    </button>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="public-event-detail__error" role="alert" data-testid="public-event-error">
      {{ error }}
    </p>
    <template v-else-if="event">
      <EventCard
        :title="event.title"
        :event-date="event.eventDate"
        :venue="event.venue"
        :status="event.status"
        :cover-src="resolveCoverSrc(event.coverImageUrl)"
      />
      <section class="public-event-detail__body">
        <div class="public-event-detail__meta">
          <StatusBadge :status="event.status" />
          <span>{{ formatDate(event.eventDate) }}</span>
          <span v-if="event.eventType">{{ event.eventType.name }}</span>
        </div>
        <p class="public-event-detail__venue"><strong>Venue:</strong> {{ event.venue }}</p>
        <p v-if="event.description" class="public-event-detail__description" data-testid="public-event-description">
          {{ event.description }}
        </p>
        <p v-else class="public-event-detail__description public-event-detail__description--empty">
          No description provided.
        </p>

        <section class="public-event-detail__schedule" data-testid="public-event-schedule">
          <h2 class="public-event-detail__schedule-title">Program &amp; Schedule</h2>
          <div v-if="schedule.length" class="public-event-detail__timeline">
            <div
              v-for="item in schedule"
              :key="item.id"
              class="public-event-detail__timeline-item"
            >
              <div class="public-event-detail__timeline-bullet" />
              <div class="public-event-detail__timeline-content">
                <span class="public-event-detail__timeline-time">
                  {{ formatTime(item.startTime) }} – {{ formatTime(item.endTime) }}
                </span>
                <strong class="public-event-detail__timeline-name">
                  {{ item.activityName }}
                </strong>
              </div>
            </div>
          </div>
          <p v-else class="public-event-detail__schedule-empty">
            No schedule has been published for this event yet.
          </p>
        </section>

        <p class="public-event-detail__enrollment-notice" data-testid="enrollment-notice">
          ℹ️ Participants are enrolled by course instructors and coordinators.
        </p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.public-event-detail {
  padding: 1.5rem;
  width: 100%;
  box-sizing: border-box;
  max-width: 720px;
}
.public-event-detail__back {
  border: none;
  background: none;
  color: var(--brand-text);
  cursor: pointer;
  font: inherit;
  padding: 0 0 1rem;
}
.public-event-detail__error {
  color: var(--danger-text);
}
.public-event-detail__body {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
}
.public-event-detail__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  color: var(--muted-plum);
}
.public-event-detail__description--empty {
  color: var(--muted);
}
.public-event-detail__schedule {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--rose-line);
}
.public-event-detail__schedule-title {
  margin: 0 0 0.85rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-strong);
}
.public-event-detail__timeline {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding-left: 0.5rem;
}
.public-event-detail__timeline-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding-left: 1rem;
  border-left: 2px solid var(--pink-line);
}
.public-event-detail__timeline-bullet {
  position: absolute;
  left: -0.35rem;
  top: 0.25rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--brand-strong-btn);
}
.public-event-detail__timeline-content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.public-event-detail__timeline-time {
  font-size: 0.8rem;
  color: var(--muted-plum);
  font-weight: 600;
}
.public-event-detail__timeline-name {
  color: var(--text-strong);
  font-size: 0.95rem;
}
.public-event-detail__schedule-empty {
  color: var(--muted-plum);
  font-style: italic;
  margin: 0;
}
.public-event-detail__enrollment-notice {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: var(--rose-soft);
  border: 1px solid var(--rose-line-2);
  color: var(--brand-text);
  font-size: 0.88rem;
  line-height: 1.4;
}
</style>
