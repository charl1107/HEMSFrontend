<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Card, StatusBadge } from '@/components/ui'
import { useAuthStore } from '../../stores/auth.store'
import { EVENT_READ_ROLES } from '../../api/events.api'
import { listMyAttendance, type MyAttendanceRow } from '../../api/attendance.api'
import { formatUserDisplayName } from '../../utils/user-name'

const auth = useAuthStore()
const canBrowseWorkspace = EVENT_READ_ROLES.some((role) => auth.roles.includes(role))

const records = ref<MyAttendanceRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const upcomingEvents = computed(() => {
  return records.value
    .filter((row) =>
      ['Approved', 'Planning', 'Ongoing'].includes(row.event.status),
    )
    .sort(
      (a, b) =>
        new Date(a.event.eventDate).getTime() -
        new Date(b.event.eventDate).getTime(),
    )
    .slice(0, 5)
})

const attendanceSummary = computed(() => {
  const total = records.value.length
  const attended = records.value.filter(
    (row) => row.attendance.status === 'Present',
  ).length
  const absent = records.value.filter(
    (row) => row.attendance.status === 'Absent',
  ).length
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0
  return { total, attended, absent, rate }
})

const recentAttendance = computed(() => {
  return [...records.value]
    .sort(
      (a, b) =>
        new Date(b.attendance.updatedAt).getTime() -
        new Date(a.attendance.updatedAt).getTime(),
    )
    .slice(0, 5)
})

function formatEventDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    records.value = await listMyAttendance()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load attendance records'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <main class="dashboard" data-testid="student-dashboard">
    <header class="dashboard__header">
      <p class="dashboard__eyebrow">Student</p>
      <h1 class="dashboard__title">Student dashboard</h1>
      <p class="dashboard__intro">Welcome{{ auth.user ? `, ${formatUserDisplayName(auth.user)}` : '' }}.</p>
    </header>

    <Card title="Quick actions">
      <div class="dashboard__actions">
        <RouterLink
          class="dashboard__action"
          :to="{ name: 'public-events' }"
          data-testid="browse-events"
        >
          Browse all events
        </RouterLink>
        <RouterLink
          class="dashboard__action dashboard__action--secondary"
          :to="{ name: 'my-attendance' }"
          data-testid="my-attendance-link"
        >
          My attendance
        </RouterLink>
        <RouterLink
          v-if="canBrowseWorkspace"
          class="dashboard__action dashboard__action--secondary"
          :to="{ name: 'events-list' }"
        >
          Manage events
        </RouterLink>
      </div>
    </Card>

    <div v-if="loading" class="dashboard__loading">
      <p>Loading dashboard records…</p>
    </div>

    <p v-else-if="error" class="dashboard__error" role="alert">
      {{ error }}
    </p>

    <template v-else>
      <!-- Attendance Summary Card -->
      <Card title="Attendance Summary" data-testid="attendance-summary-card">
        <div v-if="records.length" class="dashboard__summary-grid">
          <div class="dashboard__summary-box">
            <span class="dashboard__summary-num">{{ attendanceSummary.attended }}</span>
            <span class="dashboard__summary-label">Attended</span>
          </div>
          <div class="dashboard__summary-box">
            <span class="dashboard__summary-num">{{ attendanceSummary.absent }}</span>
            <span class="dashboard__summary-label">Absent</span>
          </div>
          <div class="dashboard__summary-box">
            <span class="dashboard__summary-num">{{ attendanceSummary.rate }}%</span>
            <span class="dashboard__summary-label">Attendance Rate</span>
          </div>
          <div class="dashboard__summary-box">
            <span class="dashboard__summary-num">{{ attendanceSummary.total }}</span>
            <span class="dashboard__summary-label">Total Enrolled</span>
          </div>
        </div>
        <p v-else class="dashboard__empty-note">No attendance records yet.</p>
      </Card>

      <!-- My Upcoming Events Card -->
      <Card title="My Upcoming Events" data-testid="upcoming-events-card">
        <div v-if="upcomingEvents.length" class="dashboard__events-grid">
          <article
            v-for="row in upcomingEvents"
            :key="row.event.id"
            class="dashboard__event-item"
          >
            <div class="dashboard__event-details">
              <h3 class="dashboard__event-name">{{ row.event.title }}</h3>
              <p class="dashboard__event-sub">
                {{ formatEventDate(row.event.eventDate) }} • {{ row.event.venue }}
              </p>
            </div>
            <StatusBadge :status="row.event.status" />
          </article>
        </div>
        <p v-else class="dashboard__empty-note">No upcoming events enrolled.</p>
      </Card>

      <!-- Recent Attendance Card -->
      <Card title="Recent Attendance" data-testid="recent-attendance-card">
        <ul v-if="recentAttendance.length" class="dashboard__attendance-list">
          <li
            v-for="row in recentAttendance"
            :key="row.attendance.id"
            class="dashboard__attendance-item"
          >
            <div class="dashboard__attendance-left">
              <strong>{{ row.event.title }}</strong>
              <span class="dashboard__attendance-date">
                {{ formatEventDate(row.event.eventDate) }} (In: {{ formatTime(row.attendance.timeIn) }})
              </span>
            </div>
            <StatusBadge :status="row.attendance.status" />
          </li>
        </ul>
        <p v-else class="dashboard__empty-note">No recent attendance history.</p>
      </Card>
    </template>
  </main>
</template>

<style scoped>
.dashboard {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: var(--page);
  min-height: calc(100svh - 3.25rem);
}
.dashboard__header { max-width: 40rem; }
.dashboard__eyebrow {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brand-text);
}
.dashboard__title {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--slate-900);
}
.dashboard__intro { margin: 0; color: var(--slate-600); line-height: 1.5; }
.dashboard__actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.dashboard__action {
  display: inline-block;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand-strong-btn) 0%, var(--brand-btn) 100%);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
}
.dashboard__action:hover { filter: brightness(1.08); }
.dashboard__action--secondary {
  background: var(--surface);
  color: var(--slate-900);
  border: 1px solid var(--slate-line-2);
}
.dashboard__action--secondary:hover { border-color: var(--slate-line); background: var(--page); }
.dashboard__action:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.dashboard__summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 1rem;
}
.dashboard__summary-box {
  padding: 1rem;
  border-radius: 8px;
  background: var(--page);
  border: 1px solid var(--rose-line);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.dashboard__summary-num {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--brand-strong-btn, #be185d);
}
.dashboard__summary-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted-plum);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
}

.dashboard__events-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.dashboard__event-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--rose-line);
  background: var(--surface);
}
.dashboard__event-name {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
}
.dashboard__event-sub {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted-plum);
}

.dashboard__attendance-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.dashboard__attendance-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 0.25rem;
  border-bottom: 1px solid var(--rose-line);
}
.dashboard__attendance-item:last-child {
  border-bottom: none;
}
.dashboard__attendance-left {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.dashboard__attendance-date {
  font-size: 0.8rem;
  color: var(--muted-plum);
}
.dashboard__empty-note {
  margin: 0;
  color: var(--muted-plum);
  font-style: italic;
  font-size: 0.9rem;
}
.dashboard__error {
  color: #dc2626;
  margin: 0;
}
@media (prefers-reduced-motion: reduce) {
  .dashboard__action:hover { filter: none; }
  .dashboard__action--secondary:hover { background: var(--page); }
}
</style>
