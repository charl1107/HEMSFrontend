<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Button, Card, StatusBadge } from '@/components/ui'
import { apiErrorMessage } from '../../../api/http'
import { saveBlob } from '../../../api/documents.api'
import {
  downloadAttendanceCsv,
  downloadEventPdf,
  downloadParticipantsCsv,
  getEventReport,
  type EventReport,
  type ReportDownload,
} from '../../../api/reports.api'

const route = useRoute()
const eventId = computed(() => String(route.params.id ?? ''))

const report = ref<EventReport | null>(null)
const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const hasData = computed(() => report.value !== null)

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    report.value = await getEventReport(eventId.value)
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to load event report')
  } finally {
    loading.value = false
  }
}

async function runExport(
  label: string,
  fetcher: (id: string) => Promise<ReportDownload>,
): Promise<void> {
  if (!eventId.value) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    const { blob, filename } = await fetcher(eventId.value)
    saveBlob(blob, filename)
    notice.value = `${label} downloaded.`
  } catch (err) {
    error.value = apiErrorMessage(err, `Failed to download ${label}`)
  } finally {
    busy.value = false
  }
}

function exportAttendance(): Promise<void> {
  return runExport('Attendance CSV', downloadAttendanceCsv)
}

function exportParticipants(): Promise<void> {
  return runExport('Participants CSV', downloadParticipantsCsv)
}

function exportPdf(): Promise<void> {
  return runExport('Report PDF', downloadEventPdf)
}

onMounted(load)
</script>

<template>
  <main class="event-report" data-testid="event-report">
    <div class="event-report__header">
      <h1>Event report</h1>
      <RouterLink
        :to="{ name: 'reports-dashboard' }"
        data-testid="back-to-reports"
      >
        ← Back to reports
      </RouterLink>
    </div>

    <Card>
      <p v-if="loading">Loading…</p>
      <p
        v-else-if="error && !hasData"
        class="event-report__error"
        role="alert"
        data-testid="event-report-error"
      >
        {{ error }}
      </p>
      <template v-else-if="report">
        <p
          v-if="notice"
          class="event-report__notice"
          role="status"
          data-testid="event-report-notice"
        >
          {{ notice }}
        </p>
        <p
          v-if="error"
          class="event-report__error"
          role="alert"
          data-testid="event-report-error"
        >
          {{ error }}
        </p>

        <div class="event-report__intro">
          <div>
            <h2 class="event-report__title" data-testid="event-title">
              {{ report.event.title }}
            </h2>
            <p class="event-report__meta">
              <StatusBadge :status="report.event.status" />
              · {{ formatDate(report.event.eventDate) }}
              · {{ report.event.venue }}
              <template v-if="report.event.eventType">
                · {{ report.event.eventType }}
              </template>
            </p>
          </div>
          <div class="event-report__exports" data-testid="event-exports">
            <Button
              label="Export attendance CSV"
              severity="secondary"
              data-testid="export-attendance-csv"
              :disabled="busy"
              @click="exportAttendance"
            />
            <Button
              label="Export participants CSV"
              severity="secondary"
              data-testid="export-participants-csv"
              :disabled="busy"
              @click="exportParticipants"
            />
            <Button
              label="Export report PDF"
              data-testid="export-report-pdf"
              :disabled="busy"
              @click="exportPdf"
            />
          </div>
        </div>

        <div class="event-report__stats" data-testid="event-stats">
          <div class="event-report__stat">
            <span class="event-report__stat-label">Registered</span>
            <span class="event-report__stat-value" data-testid="stat-registered">
              {{ report.stats.registered }}
            </span>
          </div>
          <div class="event-report__stat">
            <span class="event-report__stat-label">Present</span>
            <span class="event-report__stat-value" data-testid="stat-present">
              {{ report.stats.present }}
            </span>
          </div>
          <div class="event-report__stat">
            <span class="event-report__stat-label">Absent</span>
            <span class="event-report__stat-value" data-testid="stat-absent">
              {{ report.stats.absent }}
            </span>
          </div>
          <div class="event-report__stat">
            <span class="event-report__stat-label">Missing</span>
            <span class="event-report__stat-value" data-testid="stat-missing">
              {{ report.stats.missing }}
            </span>
          </div>
          <div class="event-report__stat">
            <span class="event-report__stat-label">Absentees</span>
            <span class="event-report__stat-value" data-testid="stat-absentees">
              {{ report.stats.absentees }}
            </span>
          </div>
          <div class="event-report__stat">
            <span class="event-report__stat-label">Present rate</span>
            <span class="event-report__stat-value" data-testid="stat-present-rate">
              {{ formatPercent(report.stats.presentRate) }}
            </span>
          </div>
        </div>

        <div class="event-report__grid">
          <section class="event-report__section" data-testid="event-participant-types">
            <h3 class="event-report__section-title">Participants by type</h3>
            <table class="event-report__table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in report.participantTypes"
                  :key="row.type"
                  :data-testid="`event-participant-type-${row.type}`"
                >
                  <td>{{ row.type }}</td>
                  <td>{{ row.count }}</td>
                </tr>
                <tr v-if="!report.participantTypes.length">
                  <td colspan="2" class="event-report__empty">
                    No participants yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="event-report__section" data-testid="event-tasks">
            <h3 class="event-report__section-title">Task completion</h3>
            <table class="event-report__table">
              <thead>
                <tr>
                  <th scope="col">Done</th>
                  <th scope="col">Total</th>
                  <th scope="col">Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr data-testid="event-task-row">
                  <td>{{ report.tasks.done }}</td>
                  <td>{{ report.tasks.total }}</td>
                  <td>{{ formatPercent(report.tasks.completionRate) }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        <section class="event-report__section" data-testid="absentee-list">
          <h3 class="event-report__section-title">Absentees</h3>
          <table class="event-report__table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Email</th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in report.absentees"
                :key="row.participantId"
                :data-testid="`absentee-${row.participantId}`"
              >
                <td>{{ row.name }}</td>
                <td>{{ row.participantType }}</td>
                <td>{{ row.email ?? '—' }}</td>
                <td>{{ row.absenteeReason ?? '—' }}</td>
              </tr>
              <tr v-if="!report.absentees.length">
                <td colspan="4" class="event-report__empty" data-testid="absentees-empty">
                  No absentees.
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <p class="event-report__definition" data-testid="absentee-definition">
          {{ report.absenteeDefinition }}
        </p>
      </template>
    </Card>
  </main>
</template>

<style scoped>
.event-report {
  padding: 1.5rem;
}
.event-report__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.event-report__header h1 {
  margin: 0;
  font-size: 1.35rem;
}
.event-report__header a {
  color: var(--accent-text);
  font-weight: 500;
}
.event-report__error {
  color: var(--danger-text);
  margin: 0 0 0.75rem;
}
.event-report__notice {
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid var(--success-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
  margin: 0 0 0.75rem;
}
.event-report__intro {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.event-report__title {
  margin: 0 0 0.35rem;
  font-size: 1.15rem;
  color: var(--text-strong);
}
.event-report__meta {
  margin: 0;
  color: var(--muted);
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.event-report__exports {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.event-report__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.event-report__stat {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.event-report__stat-label {
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.event-report__stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-strong);
}
.event-report__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.event-report__section {
  margin-bottom: 1.25rem;
}
.event-report__section-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: var(--gray-700);
}
.event-report__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92em;
}
.event-report__table th,
.event-report__table td {
  border-bottom: 1px solid var(--line);
  padding: 0.45rem 0.5rem;
  text-align: left;
}
.event-report__table th {
  color: var(--muted);
  font-weight: 600;
}
.event-report__empty {
  color: var(--muted);
}
.event-report__definition {
  margin: 0.5rem 0 0;
  color: var(--muted);
  font-size: 0.85em;
  font-style: italic;
}
</style>
