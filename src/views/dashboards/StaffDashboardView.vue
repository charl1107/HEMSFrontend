<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Card, EventCard } from '@/components/ui'
import { listEvents, resolveCoverSrc, type EventRecord } from '../../api/events.api'
import { ATTENDANCE_SUPERVISOR_ROLES } from '../../api/attendance.api'
import { useAuthStore } from '../../stores/auth.store'
import { formatUserDisplayName } from '../../utils/user-name'

const auth = useAuthStore()
const events = ref<EventRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const canCapture = computed(() =>
  ATTENDANCE_SUPERVISOR_ROLES.some((role) => auth.roles.includes(role)),
)

const ongoing = computed(() =>
  events.value.filter((event) => event.status === 'Ongoing'),
)

const scheduled = computed(() =>
  events.value.filter((event) => event.status === 'Approved' || event.status === 'Planning'),
)

const upcoming = computed(() =>
  [...scheduled.value]
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 3),
)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const todayLabel = computed(() =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date()),
)

async function load(): Promise<void> {
  if (!canCapture.value) return
  loading.value = true
  error.value = null
  try {
    const page = await listEvents({ limit: 100 })
    events.value = page.items
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load events'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="dashboard" data-testid="staff-dashboard">
    <header class="dashboard__header">
      <div class="dashboard__headline">
        <p class="dashboard__eyebrow">Overview</p>
        <h1 class="dashboard__title">{{ greeting }}, {{ auth.user ? formatUserDisplayName(auth.user) : 'there' }} 👋</h1>
        <p class="dashboard__intro">{{ todayLabel }}</p>
      </div>
    </header>

    <section class="dashboard__stats">
      <article class="dashboard__stat-card">
        <span class="dashboard__stat-label">Live Active Events</span>
        <div class="dashboard__stat-value-row">
          <strong class="dashboard__stat-value">{{ ongoing.length }}</strong>
          <span class="dashboard__live-indicator"><i class="dashboard__live-dot" />Live</span>
        </div>
      </article>
      <article class="dashboard__stat-card">
        <span class="dashboard__stat-label">Scheduled Events</span>
        <strong class="dashboard__stat-value">{{ scheduled.length }}</strong>
      </article>
    </section>

    <Card v-if="canCapture" title="Upcoming events">
      <p v-if="loading" data-testid="attendance-events-loading">Loading events…</p>
      <p v-else-if="error" class="dashboard__error" role="alert" data-testid="attendance-events-error">
        {{ error }}
      </p>
      <div
        v-else-if="!ongoing.length && !upcoming.length"
        class="dashboard__empty-state"
        data-testid="no-ongoing-events"
      >
        <div class="dashboard__empty-illustration" aria-hidden="true">
          <span class="dashboard__bubble dashboard__bubble--large" />
          <span class="dashboard__bubble dashboard__bubble--small" />
          <span class="dashboard__ring" />
        </div>
        <div class="dashboard__empty-copy">
          <h2>No upcoming events yet</h2>
          <p>
            Approved and scheduled events will appear here so you can quickly check what is coming
            up next.
          </p>
        </div>
        <div class="dashboard__empty-actions">
          <RouterLink class="dashboard__secondary-btn" :to="{ name: 'reports-dashboard' }">
            Open reports
          </RouterLink>
        </div>
      </div>
      <div v-else class="dashboard__event-preview" data-testid="ongoing-events">
        <EventCard
          v-for="event in upcoming.length ? upcoming : ongoing"
          :key="event.id"
          :title="event.title"
          :event-date="event.eventDate"
          :venue="event.venue"
          :department="event.department"
          :campus-scope="event.campusScope"
          :status="event.status"
          :description="event.description"
          :cover-src="resolveCoverSrc(event.coverImageUrl)"
        >
          <RouterLink
            class="dashboard__link-btn"
            :to="{ name: event.status === 'Ongoing' ? 'attendance-capture' : 'event-detail', params: { id: event.id } }"
            :data-testid="`start-attendance-${event.id}`"
          >
            {{ event.status === 'Ongoing' ? 'Start attendance' : 'View details' }}
          </RouterLink>
        </EventCard>
      </div>

      <div class="dashboard__card-actions">
        <RouterLink class="dashboard__text-link" :to="{ name: 'events-list' }" data-testid="view-events">
          View all events
        </RouterLink>
      </div>
    </Card>
  </main>
</template>

<style scoped>
.dashboard {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  background: linear-gradient(180deg, var(--snow) 0%, var(--page) 100%);
  min-height: calc(100svh - 3.25rem);
}

.dashboard__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 60rem;
}

.dashboard__eyebrow {
  margin: 0 0 0.45rem;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brand-text);
}

.dashboard__title {
  margin: 0 0 0.35rem;
  font-size: clamp(1.9rem, 3vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--ink);
}

.dashboard__intro {
  margin: 0;
  color: var(--muted-plum);
  line-height: 1.5;
}

.dashboard__cta {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  border: 1px solid var(--pink-line);
  background: linear-gradient(135deg, var(--rose-soft) 0%, var(--rose-line) 100%);
  color: var(--brand-text);
  font-weight: 700;
  border-radius: 999px;
  padding: 0.7rem 1.05rem;
  cursor: pointer;
}

.dashboard__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  max-width: 60rem;
}

.dashboard__stat-card {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 1.15rem 1.2rem;
  border: 1px solid var(--rose-line);
  border-radius: 1rem;
  background: var(--glass-90);
  box-shadow: 0 12px 26px -22px rgba(30, 27, 36, 0.35);
}

.dashboard__stat-card--action {
  justify-content: space-between;
}

.dashboard__stat-label {
  color: var(--muted-plum);
  font-size: 0.8rem;
  font-weight: 600;
}

.dashboard__stat-value-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.dashboard__stat-value {
  color: var(--ink);
  font-size: clamp(1.8rem, 3vw, 2.2rem);
  letter-spacing: -0.05em;
}

.dashboard__live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.28rem 0.5rem;
  border-radius: 999px;
  background: var(--success-soft);
  color: var(--success-strong);
  font-size: 0.74rem;
  font-weight: 700;
}

.dashboard__live-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--online-dot);
  display: inline-block;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45);
  animation: pulse 1.8s infinite;
}

.dashboard__action-link,
.dashboard__primary-btn,
.dashboard__secondary-btn,
.dashboard__link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  border-radius: 0.8rem;
  font-weight: 700;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.dashboard__action-link,
.dashboard__primary-btn {
  padding: 0.72rem 0.9rem;
  background: linear-gradient(135deg, var(--brand-strong-btn) 0%, var(--brand-btn) 100%);
  color: #fff;
  box-shadow: 0 12px 24px -18px rgba(190, 24, 93, 0.9);
}
.dashboard__action-link { border-radius: 999px; }

.dashboard__secondary-btn {
  padding: 0.72rem 0.9rem;
  background: var(--surface);
  border: 1px solid var(--rose-line);
  color: var(--brand-text);
}

.dashboard__error {
  margin: 0;
  padding: 0.75rem 0.8rem;
  border: 1px solid var(--rose-line-2);
  border-radius: 10px;
  background: var(--rose-soft-2);
  color: var(--brand-text);
  font-size: 0.9rem;
  line-height: 1.4;
}

.dashboard__empty-state {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.2rem 0.4rem 0.25rem;
}

.dashboard__empty-illustration {
  position: relative;
  width: 8rem;
  height: 8rem;
  margin: 0 auto;
  border-radius: 1.5rem;
  background: linear-gradient(135deg, rgba(219, 39, 119, 0.08), rgba(253, 242, 248, 0.96));
  border: 1px solid var(--rose-line);
}

.dashboard__bubble,
.dashboard__ring {
  position: absolute;
  display: block;
  border-radius: 50%;
}

.dashboard__bubble--large {
  width: 3.2rem;
  height: 3.2rem;
  background: rgba(219, 39, 119, 0.18);
  left: 1.2rem;
  top: 2rem;
}

.dashboard__bubble--small {
  width: 1.6rem;
  height: 1.6rem;
  background: rgba(190, 24, 93, 0.22);
  right: 1.5rem;
  bottom: 1.4rem;
}

.dashboard__ring {
  width: 4.4rem;
  height: 4.4rem;
  border: 2px solid rgba(219, 39, 119, 0.38);
  left: 2.1rem;
  bottom: 1rem;
}

.dashboard__empty-copy {
  text-align: center;
}

.dashboard__empty-copy h2 {
  margin: 0 0 0.5rem;
  color: var(--ink);
  font-size: 1.15rem;
}

.dashboard__empty-copy p {
  margin: 0;
  color: var(--muted-plum);
  line-height: 1.6;
}

.dashboard__empty-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.dashboard__attendance {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dashboard__attendance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 0.1rem;
  border-bottom: 1px solid var(--rose-line);
}

.dashboard__attendance-row:last-child {
  border-bottom: none;
}

.dashboard__all-events {
  margin-top: 0.75rem;
}

.dashboard__text-link {
  color: var(--brand-text);
  font-weight: 700;
  text-decoration: none;
}

.dashboard__attendance-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.dashboard__attendance-title {
  color: var(--ink);
  font-weight: 600;
}

.dashboard__event-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 0.25rem;
  max-width: 46rem;
}

.dashboard__event-preview :deep(.ui-event-card) {
  flex: 0 1 22rem;
  width: min(100%, 22rem);
}

.dashboard__card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.dashboard__link-btn {
  padding: 0.62rem 0.9rem;
  background: linear-gradient(135deg, var(--brand-strong-btn) 0%, var(--brand-btn) 100%);
  color: #fff;
  white-space: nowrap;
}

.dashboard__link-btn:hover,
.dashboard__primary-btn:hover,
.dashboard__secondary-btn:hover,
.dashboard__action-link:hover,
.dashboard__cta:hover {
  transform: translateY(-1px);
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

@media (max-width: 840px) {
  .app-bar {
    flex-wrap: wrap;
    justify-content: center;
  }

  .app-bar__profile {
    width: 100%;
    justify-content: center;
    margin-left: 0;
  }

  .dashboard__header,
  .dashboard__stats {
    display: grid;
  }

  .dashboard__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 0.65rem;
  }

  .dashboard__stat-card:not(.dashboard__stat-card--action) {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto;
    align-content: center;
    gap: 0.45rem;
    min-width: 0;
    min-height: 5.7rem;
    padding: 0.75rem;
  }

  .dashboard__stat-card:not(.dashboard__stat-card--action) .dashboard__stat-value-row {
    grid-column: 1;
    grid-row: 2;
  }

  .dashboard__stat-card:not(.dashboard__stat-card--action) > .dashboard__stat-value {
    grid-column: 1;
    grid-row: 2;
    font-size: 1.55rem;
  }

  .dashboard__stat-card:not(.dashboard__stat-card--action) > .dashboard__stat-label {
    grid-column: 1;
    grid-row: 1;
    font-size: 0.72rem;
    line-height: 1.25;
  }

  .dashboard__stat-card--action {
    grid-column: 1 / -1;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 0.9rem;
  }

  .dashboard__stat-card--action .dashboard__action-link {
    flex: 0 1 auto;
    width: auto;
    padding: 0.6rem 0.9rem;
  }

  .dashboard__card-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard__link-btn:hover,
  .dashboard__primary-btn:hover,
  .dashboard__secondary-btn:hover,
  .dashboard__action-link:hover,
  .dashboard__cta:hover {
    transform: none;
  }

  .dashboard__live-dot {
    animation: none;
  }
}

@media (max-width: 640px) {
  .dashboard__event-preview {
    flex-wrap: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.2rem 0;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    mask-image: linear-gradient(to right, transparent, #000 1rem, #000 calc(100% - 1rem), transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, #000 1rem, #000 calc(100% - 1rem), transparent);
  }

  .dashboard__event-preview::-webkit-scrollbar {
    display: none;
  }

  .dashboard__event-preview :deep(.ui-event-card) {
    flex: 0 0 min(82vw, 22rem);
    width: min(82vw, 22rem);
    scroll-snap-align: start;
  }

  .dashboard__event-preview :deep(.ui-event-card__media) {
    aspect-ratio: auto;
    height: 5.5rem;
  }

  .dashboard__event-preview :deep(.ui-event-card__body) {
    gap: 0.15rem;
    padding: 0.5rem 0.65rem 0.6rem;
  }

  .dashboard__event-preview :deep(.ui-event-card__description) {
    -webkit-line-clamp: 1;
    font-size: 0.82rem;
    line-height: 1.35;
  }

  .dashboard__event-preview .dashboard__link-btn {
    padding: 0.42rem 0.65rem;
    font-size: 0.9rem;
  }
}
</style>
