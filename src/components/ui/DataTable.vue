<script setup lang="ts" generic="T">
import { computed, ref, watch } from 'vue'

export interface DataTableColumn {
  key: string
  header: string
  field?: string
}

const props = withDefaults(
  defineProps<{
    columns: DataTableColumn[]
    rows: T[]
    dataKey: keyof T & string
    striped?: boolean
    paginator?: boolean
    lazy?: boolean
    page?: number
    pageSize?: number
    total?: number
  }>(),
  {
    striped: false,
    paginator: false,
    lazy: false,
    page: 0,
    pageSize: 10,
    total: 0,
  },
)

const emit = defineEmits<{
  page: [event: { page: number; rows: number }]
}>()

const internalPage = ref(props.page)

watch(
  () => props.page,
  (value) => {
    if (props.lazy) internalPage.value = value
  },
)

const activePage = computed(() => (props.lazy ? props.page : internalPage.value))

const displayRows = computed(() => {
  if (!props.paginator || props.lazy) return props.rows
  const start = activePage.value * props.pageSize
  return props.rows.slice(start, start + props.pageSize)
})

const pageCount = computed(() => {
  if (props.lazy) return Math.max(1, Math.ceil(props.total / props.pageSize))
  if (!props.paginator) return 1
  return Math.max(1, Math.ceil(props.rows.length / props.pageSize))
})

const canPrev = computed(() => activePage.value > 0)
const canNext = computed(() => activePage.value + 1 < pageCount.value)

function rowKey(row: T): string {
  return String((row as Record<string, unknown>)[props.dataKey])
}

function cellValue(row: T, column: DataTableColumn): unknown {
  if (!column.field) return ''
  return (row as Record<string, unknown>)[column.field]
}

function goTo(page: number): void {
  if (page < 0 || page >= pageCount.value) return
  if (props.lazy) {
    emit('page', { page, rows: props.pageSize })
    return
  }
  internalPage.value = page
}
</script>

<template>
  <div class="ui-table-wrap" v-bind="$attrs">
    <table class="ui-table" :class="{ 'ui-table--striped': striped }">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" scope="col">
            {{ column.header }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in displayRows" :key="rowKey(row)">
          <td v-for="column in columns" :key="column.key">
            <slot name="cell" :row="row" :column="column" :value="cellValue(row, column)">
              {{ cellValue(row, column) }}
            </slot>
          </td>
        </tr>
        <tr v-if="displayRows.length === 0">
          <td :colspan="columns.length" class="ui-table__empty">
            <slot name="empty" />
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="paginator && pageCount > 1" class="ui-table__pager">
      <button
        type="button"
        class="ui-table__pager-btn"
        :disabled="!canPrev"
        data-testid="table-prev"
        @click="goTo(activePage - 1)"
      >
        Previous
      </button>
      <span class="ui-table__pager-status" data-testid="table-page-status">
        Page {{ activePage + 1 }} of {{ pageCount }}
      </span>
      <button
        type="button"
        class="ui-table__pager-btn"
        :disabled="!canNext"
        data-testid="table-next"
        @click="goTo(activePage + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<style scoped>
.ui-table-wrap {
  width: 100%;
  overflow-x: auto;
}
.ui-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}
.ui-table th,
.ui-table td {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
.ui-table th {
  font-weight: 600;
  color: var(--gray-700);
  background: var(--surface-2);
}
.ui-table--striped tbody tr:nth-child(even) {
  background: var(--surface-2);
}
.ui-table__empty {
  color: var(--muted);
}
.ui-table__pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.ui-table__pager-btn {
  font: inherit;
  padding: 0.35rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-strong);
  cursor: pointer;
}
.ui-table__pager-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ui-table__pager-status {
  color: var(--muted);
  font-size: 0.9rem;
}
</style>
