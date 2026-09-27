<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  Button,
  Card,
  DataTable,
  type DataTableColumn,
} from '@/components/ui'
import {
  listAuditLogs,
  summarizeAuditBody,
  type AuditLogItem,
  type AuditLogPage,
} from '../../api/audit.api'
import { listUsers } from '../../api/users.api'
import type { SafeUser } from '../../api/auth.types'

const page = ref<AuditLogPage | null>(null)
const users = ref<SafeUser[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const userId = ref('')
const entity = ref('')
const action = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const pageCurrent = ref(1)
const pageSize = ref(20)

const columns: DataTableColumn[] = [
  { key: 'createdAt', header: 'Timestamp', field: 'createdAt' },
  { key: 'user', header: 'User' },
  { key: 'entity', header: 'Entity', field: 'entity' },
  { key: 'action', header: 'Action', field: 'action' },
  { key: 'method', header: 'Method', field: 'method' },
  { key: 'path', header: 'Path', field: 'path' },
  { key: 'summary', header: 'Summary' },
  { key: 'statusCode', header: 'Status', field: 'statusCode' },
]

async function load() {
  loading.value = true
  error.value = null
  try {
    page.value = await listAuditLogs({
      userId: userId.value || undefined,
      entity: entity.value.trim() || undefined,
      action: action.value.trim() || undefined,
      dateFrom: dateFrom.value
        ? new Date(`${dateFrom.value}T00:00:00`).toISOString()
        : undefined,
      dateTo: dateTo.value
        ? new Date(`${dateTo.value}T23:59:59.999`).toISOString()
        : undefined,
      page: pageCurrent.value,
      pageSize: pageSize.value,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load audit log'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pageCurrent.value = 1
  void load()
}

function resetFilters() {
  userId.value = ''
  entity.value = ''
  action.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  pageCurrent.value = 1
  void load()
}

function onPage(event: { page: number; rows: number }) {
  pageCurrent.value = event.page + 1
  pageSize.value = event.rows
  void load()
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function userLabel(item: AuditLogItem): string {
  if (item.user) {
    return `${item.user.firstName} ${item.user.lastName} (${item.user.email})`
  }
  return item.userId ?? 'System'
}

onMounted(async () => {
  try {
    users.value = await listUsers()
  } catch {
    users.value = []
  }
  await load()
})
</script>

<template>
  <main class="audit" data-testid="admin-audit">
    <Card title="Audit log">
      <div class="audit__filters">
        <label>
          User
          <select v-model="userId" data-testid="audit-user-filter">
            <option value="">All users</option>
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.firstName }} {{ user.lastName }}
            </option>
          </select>
        </label>
        <label>
          Entity
          <input
            v-model="entity"
            type="text"
            placeholder="e.g. events"
            data-testid="audit-entity-filter"
          />
        </label>
        <label>
          Action
          <input
            v-model="action"
            type="text"
            placeholder="e.g. approve"
            data-testid="audit-action-filter"
          />
        </label>
        <label>
          From
          <input
            v-model="dateFrom"
            type="date"
            data-testid="audit-date-from"
          />
        </label>
        <label>
          To
          <input v-model="dateTo" type="date" data-testid="audit-date-to" />
        </label>
        <div class="audit__filter-actions">
          <Button
            label="Apply"
            data-testid="audit-apply"
            @click="applyFilters"
          />
          <Button
            label="Reset"
            severity="secondary"
            data-testid="audit-reset"
            @click="resetFilters"
          />
        </div>
      </div>

      <p v-if="loading">Loading…</p>
      <p v-else-if="error" class="audit__error" role="alert" data-testid="audit-error">
        {{ error }}
      </p>
      <template v-else>
        <p class="audit__count" data-testid="audit-count">
          {{ page?.total ?? 0 }} entries
        </p>
        <DataTable
          :columns="columns"
          :rows="page?.items ?? []"
          data-key="id"
          striped
          paginator
          lazy
          :page="pageCurrent - 1"
          :page-size="pageSize"
          :total="page?.total ?? 0"
          data-testid="audit-table"
          @page="onPage"
        >
          <template #cell="{ row, column, value }">
            <template v-if="column.key === 'createdAt'">
              {{ formatTimestamp(row.createdAt) }}
            </template>
            <template v-else-if="column.key === 'user'">{{ userLabel(row) }}</template>
            <template v-else-if="column.key === 'summary'">
              {{ summarizeAuditBody(row.body) }}
            </template>
            <template v-else>{{ value }}</template>
          </template>
          <template #empty>
            <p data-testid="audit-empty">No audit entries match the current filters.</p>
          </template>
        </DataTable>
      </template>
    </Card>
  </main>
</template>

<style scoped>
.audit {
  padding: 1.5rem;
  background: linear-gradient(180deg, var(--snow) 0%, var(--page) 100%);
}
.audit__filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.audit__filters label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--muted-plum);
  font-weight: 600;
}
.audit__filters input,
.audit__filters select {
  min-width: 10rem;
  font: inherit;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--rose-line);
  border-radius: 10px;
  color: var(--ink);
  background: var(--surface);
}
.audit__filter-actions {
  display: flex;
  gap: 0.5rem;
}
.audit__filter-actions :deep(button:first-child) {
  border: 1px solid var(--brand-btn);
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand-strong-btn) 0%, var(--brand-btn) 100%);
  color: #fff;
  font-weight: 700;
}
.audit__filter-actions :deep(button:first-child:hover:not(:disabled)) { filter: brightness(1.06); }
.audit :deep(.ui-table-wrap[data-testid='audit-table']) {
  overflow: auto;
  border: 1px solid var(--rose-line);
  border-radius: 0.75rem;
  background: var(--surface);
}
.audit :deep(.ui-table-wrap[data-testid='audit-table'] .ui-table) { background: var(--surface); }
.audit :deep(.ui-table-wrap[data-testid='audit-table'] .ui-table th) {
  border-bottom-color: var(--rose-line-2);
  background: var(--rose-soft);
  color: var(--brand-text);
}
.audit :deep(.ui-table-wrap[data-testid='audit-table'] .ui-table td) { color: var(--ink); }
.audit__count {
  color: var(--muted-plum);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}
.audit__error {
  color: var(--brand-text);
}
</style>
