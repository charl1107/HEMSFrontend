<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  EventCard,
} from '@/components/ui'
import { useAuthStore } from '../../../stores/auth.store'
import {
  EVENT_CAMPUS_SCOPES,
  EVENT_READ_ROLES,
  EVENT_STATUSES,
  listEvents,
  resolveCoverSrc,
  type EventRecord,
} from '../../../api/events.api'

const PAGE_SIZE = 50

const auth = useAuthStore()
const events = ref<EventRecord[]>([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const statusFilter = ref<string>('')
const typeFilter = ref<string>('')
const campusFilter = ref<string>('')
const searchQuery = ref<string>('')
const typeNames = ref<string[]>([])

const canRead = computed(() =>
  EVENT_READ_ROLES.some((role) => auth.roles.includes(role)),
)

const filteredEvents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return events.value
  return events.value.filter((event) => {
    const titleMatch = event.title.toLowerCase().includes(query)
    const venueMatch = event.venue.toLowerCase().includes(query)
    return titleMatch || venueMatch
  })
})

function descriptionExcerpt(value: string | null): string | null {
  if (!value) return null
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > 150 ? `${normalized.slice(0, 147)}...` : normalized
}

async function load(reset: boolean): Promise<void> {
  if (reset) {
    loading.value = true
    error.value = null
  } else {
    loadingMore.value = true
  }
  try {
    const page = await listEvents({
      limit: PAGE_SIZE,
      offset: reset ? 0 : events.value.length,
      status: statusFilter.value || undefined,
      type: typeFilter.value || undefined,
      campusScope: campusFilter.value || undefined,
    })
    events.value = reset ? page.items : [...events.value, ...page.items]
    total.value = page.total
    const names = new Set(typeNames.value)
    for (const event of page.items) {
      if (event.eventType?.name) names.add(event.eventType.name)
    }
    typeNames.value = [...names].sort()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load events'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

watch([statusFilter, typeFilter, campusFilter], () => {
  void load(true)
})

onMounted(() => {
  void load(true)
})
</script>

<template>
  <main class="events-list" data-testid="events-list">
    <div class="events-list__header">
      <h1>Events</h1>
    </div>
    <section class="events-list__workspace">
      <p v-if="!canRead" class="events-list__denied" data-testid="events-denied">
        You do not have access to the events workspace.
      </p>
      <template v-else>
        <p v-if="loading">Loading…</p>
        <p v-else-if="error" class="events-list__error" role="alert" data-testid="events-error">
          {{ error }}
        </p>
        <template v-else>
          <div class="events-list__filters">
            <label class="events-list__search-label">
              Search
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search by title or venue…"
                class="events-list__search-input"
                data-testid="events-search-input"
              />
            </label>
            <label>
              Status
              <select v-model="statusFilter" data-testid="status-filter">
                <option value="">All statuses</option>
                <option v-for="status in EVENT_STATUSES" :key="status" :value="status">
                  {{ status }}
                </option>
              </select>
            </label>
            <label>
              Type
              <select v-model="typeFilter" data-testid="type-filter">
                <option value="">All types</option>
                <option v-for="name in typeNames" :key="name" :value="name">
                  {{ name }}
                </option>
              </select>
            </label>
            <label>
              Campus location
              <select v-model="campusFilter" data-testid="campus-filter">
                <option value="">Inside and outside campus</option>
                <option v-for="scope in EVENT_CAMPUS_SCOPES" :key="scope" :value="scope">
                  {{ scope === 'OnCampus' ? 'Inside campus' : 'Outside campus' }}
                </option>
              </select>
            </label>
          </div>
          <div v-if="filteredEvents.length" class="events-list__grid" data-testid="events-table">
            <EventCard
              v-for="event in filteredEvents"
              :key="event.id"
              :title="event.title"
              :description="descriptionExcerpt(event.description)"
              :event-date="event.eventDate"
              :venue="event.venue"
              :department="event.department"
              :campus-scope="event.campusScope"
              :status="event.status"
              :cover-src="resolveCoverSrc(event.coverImageUrl)"
            >
              <div class="events-list__actions">
                <RouterLink
                  :to="{ name: 'event-detail', params: { id: event.id } }"
                  :data-testid="`view-event-${event.id}`"
                >
                  View details
                </RouterLink>
              </div>
            </EventCard>
          </div>
          <p v-else class="events-list__empty" data-testid="events-empty">
            No events match the current filters.
          </p>
          <button
            v-if="events.length < total"
            type="button"
            class="events-list__load-more"
            data-testid="load-more-events"
            :disabled="loadingMore"
            @click="load(false)"
          >
            {{ loadingMore ? 'Loading…' : `Load more (${events.length} of ${total})` }}
          </button>
        </template>
      </template>
    </section>
  </main>
</template>

<style scoped>
.events-list {
  padding: 1.5rem;
  background: linear-gradient(180deg, var(--snow) 0%, var(--page) 100%);
}
.events-list__header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  min-height: 2.9rem;
}
.events-list__header h1 {
  margin: 0;
  font-size: clamp(1.8rem, 2vw, 2.3rem);
  color: var(--ink);
}
.events-list__filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.events-list__filters label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--muted-plum);
  font-weight: 600;
}
.events-list__filters select,
.events-list__search-input {
  min-width: 10.5rem;
  font: inherit;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--rose-line);
  border-radius: 10px;
  color: var(--ink);
  background: var(--surface);
}
.events-list__workspace {
  max-width: 76rem;
  padding: 1.25rem;
  border: 1px solid var(--rose-line);
  border-radius: 1.2rem;
  background: var(--glass-82);
  box-shadow: 0 18px 45px -38px rgba(30, 27, 36, 0.45);
}
.events-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 1rem;
}
.events-list__grid :deep(.ui-event-card) {
  border-color: var(--rose-line);
  border-radius: 0.95rem;
  box-shadow: 0 12px 28px -24px rgba(30, 27, 36, 0.5);
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}
.events-list__grid :deep(.ui-event-card:hover) {
  transform: translateY(-3px);
  box-shadow: 0 18px 34px -24px rgba(190, 24, 93, 0.45);
}
.events-list__grid :deep(.ui-event-card__media) {
  aspect-ratio: 16 / 10;
}
.events-list__grid :deep(.ui-event-card__title) {
  min-height: 2.7rem;
  font-size: 1.12rem;
  line-height: 1.25;
}
.events-list__grid :deep(.ui-event-card__actions) {
  margin-top: auto;
}
.events-list__empty {
  margin: 0;
  padding: 3rem 1rem;
  border: 1px dashed var(--pink-line);
  border-radius: 1rem;
  color: var(--muted-plum);
  text-align: center;
}
.events-list__load-more {
  display: block;
  margin: 1.25rem auto 0;
  padding: 0.65rem 1.5rem;
  font: inherit;
  font-weight: 600;
  color: var(--muted-plum);
  background: var(--surface);
  border: 1px solid var(--pink-line);
  border-radius: 999px;
  cursor: pointer;
}
.events-list__load-more:hover:enabled {
  background: var(--rose-soft);
  color: var(--brand-text);
}
.events-list__load-more:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}
.events-list__load-more:disabled {
  opacity: 0.6;
  cursor: default;
}
.events-list__error,
.events-list__denied {
  color: var(--brand-text);
}
.events-list__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}
.events-list__actions a {
  color: var(--brand-text);
  text-decoration: none;
  font-weight: 600;
}
@media (max-width: 640px) {
  .events-list {
    padding: 1rem;
  }

  .events-list__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .events-list__workspace {
    padding: 0.85rem;
  }
}
</style>
