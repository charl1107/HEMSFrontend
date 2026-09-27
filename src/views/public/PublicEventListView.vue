<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { EventCard } from '@/components/ui'
import { listPublicEvents, resolveCoverSrc, type EventRecord } from '../../api/events.api'

const PAGE_SIZE = 100

const events = ref<EventRecord[]>([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)

const searchQuery = ref('')
const statusTab = ref<'All' | 'Ongoing' | 'Upcoming' | 'Past'>('All')

const filteredEvents = computed(() => {
  let list = events.value
  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter((event) => {
      const titleMatch = event.title.toLowerCase().includes(query)
      const venueMatch = event.venue.toLowerCase().includes(query)
      const descMatch = event.description?.toLowerCase().includes(query) ?? false
      return titleMatch || venueMatch || descMatch
    })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)
  if (statusTab.value === 'Ongoing') {
    list = list.filter((event) => event.status === 'Ongoing')
  } else if (statusTab.value === 'Upcoming') {
    list = list.filter(
      (event) =>
        ['Approved', 'Planning'].includes(event.status) &&
        event.eventDate.slice(0, 10) >= todayStr,
    )
  } else if (statusTab.value === 'Past') {
    list = list.filter(
      (event) =>
        event.status === 'Completed' || event.eventDate.slice(0, 10) < todayStr,
    )
  }

  return list
})

async function load(reset: boolean): Promise<void> {
  if (reset) {
    loading.value = true
    error.value = null
  } else {
    loadingMore.value = true
  }
  try {
    const page = await listPublicEvents({
      limit: PAGE_SIZE,
      offset: reset ? 0 : events.value.length,
    })
    events.value = reset ? page.items : [...events.value, ...page.items]
    total.value = page.total
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load events'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

onMounted(() => {
  void load(true)
})
</script>

<template>
  <main class="public-events" data-testid="public-events-list">
    <h1>Upcoming &amp; recent events</h1>

    <div class="public-events__toolbar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search events by title or venue…"
        class="public-events__search"
        data-testid="public-events-search"
      />
      <div class="public-events__tabs">
        <button
          type="button"
          class="public-events__tab"
          :class="{ 'public-events__tab--active': statusTab === 'All' }"
          @click="statusTab = 'All'"
        >
          All ({{ events.length }})
        </button>
        <button
          type="button"
          class="public-events__tab"
          :class="{ 'public-events__tab--active': statusTab === 'Ongoing' }"
          @click="statusTab = 'Ongoing'"
        >
          Live / Ongoing
        </button>
        <button
          type="button"
          class="public-events__tab"
          :class="{ 'public-events__tab--active': statusTab === 'Upcoming' }"
          @click="statusTab = 'Upcoming'"
        >
          Upcoming
        </button>
        <button
          type="button"
          class="public-events__tab"
          :class="{ 'public-events__tab--active': statusTab === 'Past' }"
          @click="statusTab = 'Past'"
        >
          Past
        </button>
      </div>
    </div>

    <p v-if="loading" data-testid="public-events-loading">Loading…</p>
    <p v-else-if="error" class="public-events__error" role="alert" data-testid="public-events-error">
      {{ error }}
    </p>
    <p v-else-if="!events.length" data-testid="public-events-empty">No public events yet.</p>
    <p v-else-if="!filteredEvents.length" class="public-events__empty-filter">
      No events match this filter. Choose All to see every event, including pending and cancelled events.
    </p>
    <div v-else class="public-events__grid">
      <EventCard
        v-for="event in filteredEvents"
        :key="event.id"
        :title="event.title"
        :event-date="event.eventDate"
        :venue="event.venue"
        :status="event.status"
        :cover-src="resolveCoverSrc(event.coverImageUrl)"
      >
        <RouterLink :to="{ name: 'public-event-detail', params: { id: event.id } }">
          View details
        </RouterLink>
      </EventCard>
    </div>
    <button
      v-if="events.length < total"
      type="button"
      class="public-events__load-more"
      data-testid="load-more-public-events"
      :disabled="loadingMore"
      @click="load(false)"
    >
      {{ loadingMore ? 'Loading…' : `Load more (${events.length} of ${total})` }}
    </button>
    <p class="public-events__visibility-note">
      The All tab includes events in every status. Live, Upcoming, and Past are convenience filters.
    </p>
  </main>
</template>

<style scoped>
.public-events {
  padding: 1.5rem;
  width: 100%;
  box-sizing: border-box;
}
.public-events__toolbar {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}
.public-events__search {
  max-width: 24rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--pink-line);
  border-radius: 8px;
  font: inherit;
  background: var(--surface);
  color: var(--text-strong);
}
.public-events__search:focus-visible {
  outline: 2px solid var(--brand-text);
  outline-offset: 1px;
}
.public-events__tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.public-events__tab {
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--pink-line);
  background: var(--surface);
  color: var(--muted-plum);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.public-events__tab:hover {
  background: var(--rose-soft);
  color: var(--brand-text);
}
.public-events__tab--active {
  background: linear-gradient(135deg, var(--brand-strong-btn) 0%, var(--brand-btn) 100%);
  color: #fff;
  border-color: transparent;
}
.public-events__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-top: 1.25rem;
}
.public-events__error {
  color: var(--danger-text);
}
.public-events__empty-filter {
  margin-top: 1.5rem;
  color: var(--muted-plum);
  font-style: italic;
}
.public-events__load-more {
  display: block;
  margin: 1.25rem auto 0;
  padding: 0.6rem 1.5rem;
  font: inherit;
  font-weight: 600;
  color: var(--muted-plum);
  background: var(--surface);
  border: 1px solid var(--pink-line);
  border-radius: 999px;
  cursor: pointer;
}
.public-events__load-more:hover:enabled {
  background: var(--rose-soft);
  color: var(--brand-text);
}
.public-events__load-more:focus-visible {
  outline: 2px solid var(--brand-text);
  outline-offset: 2px;
}
.public-events__load-more:disabled {
  opacity: 0.6;
  cursor: default;
}
.public-events__visibility-note {
  margin: 1rem 0 0;
  color: var(--muted-plum);
  font-size: 0.82rem;
}
:deep(.ui-event-card__actions a) {
  color: var(--brand-text);
  font-weight: 600;
  text-decoration: none;
}
:deep(.ui-event-card__actions a:hover) { text-decoration: underline; }
</style>
