<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Card, StatusBadge } from '@/components/ui'
import { apiErrorMessage } from '../../../api/http'
import {
  attendanceName,
  listMyAttendance,
  type MyAttendanceRow,
} from '../../../api/attendance.api'

const rows = ref<MyAttendanceRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const hasRows = computed(() => rows.value.length > 0)

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString()
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    rows.value = await listMyAttendance()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to load your attendance')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="my-attendance" data-testid="my-attendance">
    <div class="my-attendance__header">
      <h1>My attendance</h1>
    </div>

    <p v-if="loading">Loading…</p>
    <p
      v-else-if="error"
      class="my-attendance__error"
      role="alert"
      data-testid="my-attendance-error"
    >
      {{ error }}
    </p>

    <Card v-else title="Attendance history">
      <p v-if="!hasRows" data-testid="my-attendance-empty">
        No attendance records yet.
      </p>
      <ul v-else class="my-attendance__list" data-testid="my-attendance-list">
        <li
          v-for="row in rows"
          :key="row.attendance.id"
          class="my-attendance__row"
          :data-testid="`my-attendance-row-${row.attendance.id}`"
        >
          <div class="my-attendance__event">
            <strong>{{ row.event.title }}</strong>
            <span class="my-attendance__date">{{
              formatDate(row.event.eventDate)
            }}</span>
          </div>
          <StatusBadge :status="row.attendance.status" />
          <span class="my-attendance__times">
            In: {{ formatTime(row.attendance.timeIn) }} · Out:
            {{ formatTime(row.attendance.timeOut) }}
          </span>
          <span class="my-attendance__name">
            {{ attendanceName(row.attendance.participant) }}
          </span>
        </li>
      </ul>
      <p class="my-attendance__readonly" data-testid="my-attendance-readonly">
        This history is read-only.
      </p>
    </Card>
  </main>
</template>

<style scoped>
.my-attendance {
  padding: 1.5rem;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.my-attendance__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}
.my-attendance__header h1 {
  margin: 0;
  font-size: 1.35rem;
}
.my-attendance__error {
  color: var(--danger-text);
  margin: 0;
}
.my-attendance__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.my-attendance__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--line);
}
.my-attendance__row:last-child {
  border-bottom: none;
}
.my-attendance__event {
  flex: 1 1 14rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.my-attendance__event strong {
  color: var(--text-strong);
}
.my-attendance__date {
  color: var(--muted);
  font-size: 0.85em;
}
.my-attendance__times {
  color: var(--muted);
  font-size: 0.9em;
}
.my-attendance__name {
  color: var(--gray-700);
  font-size: 0.9em;
}
.my-attendance__readonly {
  margin: 0.75rem 0 0;
  color: var(--gray-400);
  font-size: 0.85em;
  font-style: italic;
}
</style>
