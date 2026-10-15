<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Card, DataTable, StatusBadge, type DataTableColumn } from '@/components/ui'
import { apiErrorMessage } from '../../../api/http'
import { getSummary, type SummaryReport } from '../../../api/reports.api'

const summary = ref<SummaryReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const hasData = computed(() => summary.value !== null)

const labelCountColumns: DataTableColumn[] = [
  { key: 'label', header: 'Category', field: 'label' },
  { key: 'count', header: 'Count', field: 'count' },
]

const statusColumns: DataTableColumn[] = [
  { key: 'label', header: 'Status', field: 'label' },
  { key: 'count', header: 'Count', field: 'count' },
]

const campusColumns: DataTableColumn[] = [
  { key: 'label', header: 'Location', field: 'label' },
  { key: 'count', header: 'Count', field: 'count' },
]

const taskColumns: DataTableColumn[] = [
  { key: 'done', header: 'Done', field: 'done' },
  { key: 'total', header: 'Total', field: 'total' },
  { key: 'rate', header: 'Rate', field: 'rate' },
]

const CAMPUS_LABELS: Record<'OnCampus' | 'OffCampus', string> = {
  OnCampus: 'Inside campus',
  OffCampus: 'Outside campus',
}

function countRows(counts: Record<string, number>): Array<{ label: string; count: number }> {
  return Object.entries(counts).map(([label, count]) => ({ label, count }))
}

const statusRows = computed(() => countRows(summary.value?.events.byStatus ?? {}))
const typeRows = computed(() => countRows(summary.value?.events.byType ?? {}))
const monthRows = computed(() => countRows(summary.value?.events.byMonth ?? {}))
const campusRows = computed(() =>
  Object.entries(summary.value?.events.byCampusScope ?? {}).map(([scope, count]) => ({
    label: CAMPUS_LABELS[scope as keyof typeof CAMPUS_LABELS] ?? scope,
    count,
  })),
)
const taskRows = computed(() => {
  const tasks = summary.value?.tasks
  if (!tasks) return []
  return [{ done: tasks.done, total: tasks.total, rate: `${tasks.completionRate}%` }]
})

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    summary.value = await getSummary()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to load report summary')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="reports" data-testid="reports-dashboard">
    <div class="reports__header">
      <h1>Reports</h1>
    </div>

    <Card title="Overview">
      <p v-if="loading">Loading…</p>
      <p
        v-else-if="error && !hasData"
        class="reports__error"
        role="alert"
        data-testid="reports-error"
      >
        {{ error }}
      </p>
      <template v-else-if="summary">
        <p
          v-if="error"
          class="reports__error"
          role="alert"
          data-testid="reports-error"
        >
          {{ error }}
        </p>

        <div class="reports__stats" data-testid="reports-stats">
          <div class="reports__stat">
            <span class="reports__stat-label">Events</span>
            <span class="reports__stat-value" data-testid="stat-events">
              {{ summary.events.total }}
            </span>
          </div>
          <div class="reports__stat">
            <span class="reports__stat-label">Task completion</span>
            <span class="reports__stat-value" data-testid="stat-task-rate">
              {{ summary.tasks.completionRate }}%
            </span>
          </div>
        </div>

        <div class="reports__tables">
          <section class="reports__section" data-testid="reports-by-status">
            <h3 class="reports__section-title">Events by status</h3>
            <DataTable :columns="statusColumns" :rows="statusRows" data-key="label">
              <template #cell="{ row, column }">
                <StatusBadge v-if="column.key === 'label'" :status="row.label" />
                <template v-else>{{ row[column.key as 'count'] }}</template>
              </template>
              <template #empty>
                <p class="reports__empty">No events yet.</p>
              </template>
            </DataTable>
          </section>

          <section class="reports__section" data-testid="reports-by-type">
            <h3 class="reports__section-title">Events by type</h3>
            <DataTable :columns="labelCountColumns" :rows="typeRows" data-key="label">
              <template #empty>
                <p class="reports__empty">No events yet.</p>
              </template>
            </DataTable>
          </section>

          <section class="reports__section" data-testid="reports-by-month">
            <h3 class="reports__section-title">Events by month</h3>
            <DataTable :columns="labelCountColumns" :rows="monthRows" data-key="label">
              <template #empty>
                <p class="reports__empty">No events yet.</p>
              </template>
            </DataTable>
          </section>

          <section class="reports__section" data-testid="reports-by-campus">
            <h3 class="reports__section-title">Events by campus location</h3>
            <DataTable :columns="campusColumns" :rows="campusRows" data-key="label">
              <template #empty>
                <p class="reports__empty">No events yet.</p>
              </template>
            </DataTable>
          </section>

          <section class="reports__section" data-testid="reports-tasks">
            <h3 class="reports__section-title">Task completion</h3>
            <DataTable :columns="taskColumns" :rows="taskRows" data-key="done" />
          </section>
        </div>
      </template>
    </Card>
  </main>
</template>

<style scoped>
.reports {
  padding: 1.5rem;
  background: linear-gradient(180deg, var(--snow) 0%, var(--page) 100%);
}
.reports__header h1 {
  margin: 0 0 1rem;
  color: var(--ink);
  font-size: clamp(1.8rem, 2vw, 2.3rem);
}
.reports__error {
  color: var(--danger-text);
  margin: 0 0 0.75rem;
}
.reports__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.reports__stat {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.reports__stat-label {
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.reports__stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-strong);
}
.reports__tables {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.reports__section {
  margin-bottom: 1.25rem;
}
.reports__section-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  color: var(--gray-700);
}
.reports__empty {
  color: var(--muted);
}

@media (max-width: 640px) {
  .reports { padding: 0.85rem; }
}
</style>
