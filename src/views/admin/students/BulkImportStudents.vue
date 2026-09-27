<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui'
import { createUser } from '../../../api/users.api'
import type { SafeUser } from '../../../api/auth.types'
import { csvRowToPayload, parseStudentsCsv, CSV_TEMPLATE_HEADER, CSV_TEMPLATE_EXAMPLE, type CsvStudentRow } from './csv-import'

const emit = defineEmits<{ imported: [users: SafeUser[]]; cancel: [] }>()
type RowState = { row: CsvStudentRow; status: 'pending' | 'success' | 'error'; error?: string }
const fileName = ref<string | null>(null)
const parseErrors = ref<string[]>([])
const rowStates = ref<RowState[]>([])
const importing = ref(false)
const done = ref(false)
const canImport = computed(() => rowStates.value.length > 0 && !importing.value && !done.value)

function loadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  fileName.value = file?.name ?? null
  rowStates.value = []
  parseErrors.value = []
  done.value = false
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const parsed = parseStudentsCsv(String(reader.result ?? ''))
    parseErrors.value = parsed.errors
    rowStates.value = parsed.rows.map((row) => ({ row, status: 'pending' }))
  }
  reader.onerror = () => { parseErrors.value = ['Could not read the file. Please try again.'] }
  reader.readAsText(file)
}

function downloadTemplate() {
  const blob = new Blob([`${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE}\n`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'students-import-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

async function importRows() {
  if (!canImport.value) return
  importing.value = true
  const created: SafeUser[] = []
  for (const entry of rowStates.value) {
    try {
      created.push(await createUser(csvRowToPayload(entry.row)))
      entry.status = 'success'
    } catch {
      entry.status = 'error'
      entry.error = 'Could not create this account. Check that its email and student ID are unique, then try again.'
    }
  }
  importing.value = false
  done.value = true
  if (created.length) emit('imported', created)
}
</script>

<template>
  <div class="bulk-import" data-testid="bulk-import-students">
    <p>Upload a CSV file to create multiple student accounts. Leave email blank to use studentId@chcc.edu.ph, and leave password blank to use the default first-login password.</p>
    <button type="button" class="bulk-import__template" @click="downloadTemplate">Download CSV template</button>
    <label class="bulk-import__file">
      <span>{{ fileName || 'Choose a CSV file' }}</span>
      <input type="file" accept=".csv,text/csv" data-testid="bulk-import-file" @change="loadFile" />
    </label>
    <ul v-if="parseErrors.length" class="bulk-import__errors" data-testid="bulk-import-errors"><li v-for="error in parseErrors" :key="error">{{ error }}</li></ul>
    <p v-if="rowStates.length">{{ rowStates.length }} valid student rows{{ done ? ` · ${rowStates.filter(row => row.status === 'success').length} created · ${rowStates.filter(row => row.status === 'error').length} failed` : ' ready' }}</p>
    <div v-if="rowStates.length" class="bulk-import__rows">
      <div v-for="entry in rowStates" :key="entry.row.line" :data-testid="`bulk-row-${entry.row.line}`">
        Row {{ entry.row.line }} — {{ entry.row.firstName }} {{ entry.row.lastName }} ({{ entry.row.email }}): {{ entry.status }}
        <span v-if="entry.error">{{ entry.error }}</span>
      </div>
    </div>
    <footer class="bulk-import__actions">
      <button type="button" @click="emit('cancel')">{{ done ? 'Close' : 'Cancel' }}</button>
      <Button v-if="!done" label="Import students" data-testid="bulk-import-submit" :disabled="!canImport" @click="importRows" />
    </footer>
  </div>
</template>

<style scoped>
.bulk-import { display: flex; flex-direction: column; gap: 1rem; }
.bulk-import { color: var(--text-strong); }
.bulk-import__template, .bulk-import__actions button { border: 0; background: transparent; color: var(--accent-text); cursor: pointer; font: inherit; }
.bulk-import__template { justify-self: start; }
.bulk-import__template:hover, .bulk-import__actions button:hover { text-decoration: underline; }
.bulk-import__file { display: grid; gap: .5rem; min-width: 0; padding: 1rem; border: 1px dashed var(--line); border-radius: .75rem; color: var(--text-strong); background: var(--surface-2); cursor: pointer; }
.bulk-import__file input { width: 100%; min-width: 0; color: var(--text-strong); font: inherit; }
.bulk-import__file input::file-selector-button { margin-right: .65rem; padding: .4rem .65rem; border: 1px solid var(--line); border-radius: .4rem; color: var(--text-strong); background: var(--surface); cursor: pointer; }
.bulk-import__errors { color: var(--danger-strong); }
.bulk-import__rows { max-height: 14rem; overflow: auto; }
.bulk-import__actions { display: flex; justify-content: flex-end; align-items: center; gap: 1rem; }
.bulk-import__actions > button { color: var(--muted-plum, var(--muted)); }
.bulk-import__actions > button:hover { color: var(--accent-text); }
.bulk-import__actions :deep(.ui-button:disabled) { opacity: .72; }
@media (max-width: 520px) {
  .bulk-import__actions { position: sticky; bottom: -0.9rem; flex-wrap: wrap; padding: 0.75rem 0; background: var(--surface); }
  .bulk-import__actions :deep(.ui-button) { flex: 1 1 9rem; }
  .bulk-import__template { text-align: left; }
}
</style>
