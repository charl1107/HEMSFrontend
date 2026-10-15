<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EventCard, StatusBadge } from '@/components/ui'
import { getPublicEvent, resolveCoverSrc, type EventRecord } from '../../api/events.api'

const route = useRoute()
const router = useRouter()

const event = ref<EventRecord | null>(null)
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

onMounted(async () => {
  const id = String(route.params.id)
  loading.value = true
  error.value = null
  try {
    event.value = await getPublicEvent(id)
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
</style>
