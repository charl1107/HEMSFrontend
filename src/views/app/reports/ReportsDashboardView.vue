<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Card, StatusBadge } from '@/components/ui'
import { apiErrorMessage } from '../../../api/http'
import { getSummary, type SummaryReport } from '../../../api/reports.api'

const summary = ref<SummaryReport | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const hasData = computed(() => summary.value !== null)

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
            <table class="reports__table">
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(count, status) in summary.events.byStatus"
                  :key="status"
                  :data-testid="`by-status-${status}`"
                >
                  <td><StatusBadge :status="status" /></td>
                  <td>{{ count }}</td>
                </tr>
                <tr v-if="!Object.keys(summary.events.byStatus).length">
                  <td colspan="2" class="reports__empty">No events yet.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="reports__section" data-testid="reports-by-type">
            <h3 class="reports__section-title">Events by type</h3>
            <table class="reports__table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(count, type) in summary.events.byType"
                  :key="type"
                  :data-testid="`event-type-${type}`"
                >
                  <td>{{ type }}</td>
                  <td>{{ count }}</td>
                </tr>
                <tr v-if="!Object.keys(summary.events.byType).length">
                  <td colspan="2" class="reports__empty">No events yet.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="reports__section" data-testid="reports-tasks">
            <h3 class="reports__section-title">Task completion</h3>
            <table class="reports__table">
              <thead>
                <tr>
                  <th scope="col">Done</th>
                  <th scope="col">Total</th>
                  <th scope="col">Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr data-testid="task-completion-row">
                  <td>{{ summary.tasks.done }}</td>
                  <td>{{ summary.tasks.total }}</td>
                  <td>{{ summary.tasks.completionRate }}%</td>
                </tr>
              </tbody>
            </table>
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
.reports__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92em;
}
.reports__table th,
.reports__table td {
  border-bottom: 1px solid var(--line);
  padding: 0.45rem 0.5rem;
  text-align: left;
}
.reports__table th {
  color: var(--muted);
  font-weight: 600;
}
.reports__empty {
  color: var(--muted);
}

@media (max-width: 640px) {
  .reports { padding: 0.85rem; }
}
</style>
