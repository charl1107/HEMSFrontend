<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button, Card } from '@/components/ui'
import { apiErrorMessage } from '../../../api/http'
import { isPlanningAllowedStatus } from '../../../api/events.api'
import {
  DOC_TYPES,
  downloadDocument,
  listDocuments,
  removeDocument,
  saveBlob,
  uploadDocument,
  type DocType,
  type DocumentRecord,
} from '../../../api/documents.api'
import {
  formatFileSize,
  groupDocumentsByType,
  precheckDocumentFile,
} from './documents'

const props = defineProps<{
  eventId: string
  status: string
  canManage: boolean
}>()

const documents = ref<DocumentRecord[]>([])
const loading = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const selectedFile = ref<File | null>(null)
const docType = ref<DocType>('Proposal')
const fileInput = ref<HTMLInputElement | null>(null)

const planningOpen = computed(() => isPlanningAllowedStatus(props.status))
const showUpload = computed(() => planningOpen.value && props.canManage)
const groups = computed(() => groupDocumentsByType(documents.value))

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  error.value = null
  notice.value = null
  selectedFile.value = null
  if (!file) return
  const check = precheckDocumentFile(file)
  if (!check.ok) {
    error.value = check.message ?? 'Invalid document file'
    input.value = ''
    return
  }
  selectedFile.value = file
}

async function refresh(): Promise<void> {
  documents.value = await listDocuments(props.eventId)
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to load documents')
  } finally {
    loading.value = false
  }
}

async function onUpload(): Promise<void> {
  const file = selectedFile.value
  if (!showUpload.value || !file) return
  const check = precheckDocumentFile(file)
  if (!check.ok) {
    error.value = check.message ?? 'Invalid document file'
    return
  }
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await uploadDocument(props.eventId, file, docType.value)
    notice.value = 'Document uploaded.'
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to upload document')
  } finally {
    busy.value = false
  }
}

async function onDownload(doc: DocumentRecord): Promise<void> {
  busy.value = true
  error.value = null
  notice.value = null
  try {
    const blob = await downloadDocument(props.eventId, doc.id)
    saveBlob(blob, doc.originalFilename)
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to download document')
  } finally {
    busy.value = false
  }
}

async function onDelete(doc: DocumentRecord): Promise<void> {
  if (!showUpload.value) return
  busy.value = true
  error.value = null
  notice.value = null
  try {
    await removeDocument(props.eventId, doc.id)
    notice.value = 'Document deleted.'
    await refresh()
  } catch (err) {
    error.value = apiErrorMessage(err, 'Failed to delete document')
  } finally {
    busy.value = false
  }
}

onMounted(load)
</script>

<template>
  <Card title="Documents" data-testid="documents-section">
    <p v-if="loading">Loading…</p>
    <template v-else>
      <p
        v-if="error"
        class="docs__error"
        role="alert"
        data-testid="documents-error"
      >
        {{ error }}
      </p>
      <p
        v-if="notice"
        class="docs__notice"
        role="status"
        data-testid="documents-notice"
      >
        {{ notice }}
      </p>

      <p
        v-if="!planningOpen"
        class="docs__gate"
        role="status"
        data-testid="documents-gated"
      >
        Upload and delete are unavailable when the event status is
        {{ status }}.
      </p>

      <form
        v-if="showUpload"
        class="docs__form"
        data-testid="document-upload-form"
        @submit.prevent="onUpload"
      >
        <label class="docs__field">
          <span>File (pdf, jpeg, png, webp, docx · max 10MB) *</span>
          <input
            ref="fileInput"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            data-testid="document-file-input"
            :disabled="busy"
            @change="onFileChange"
          />
        </label>
        <label class="docs__field">
          <span>Type *</span>
          <select
            v-model="docType"
            data-testid="document-doc-type"
            :disabled="busy"
          >
            <option v-for="option in DOC_TYPES" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>
        <Button
          type="submit"
          :label="busy ? 'Uploading…' : 'Upload document'"
          data-testid="document-upload"
          :disabled="busy || !selectedFile"
        />
      </form>

      <template v-if="groups.length">
        <section
          v-for="group in groups"
          :key="group.docType"
          class="docs__group"
          :data-testid="`documents-group-${group.docType}`"
        >
          <h4 class="docs__group-title">{{ group.docType }}</h4>
          <ul class="docs__list">
            <li
              v-for="doc in group.documents"
              :key="doc.id"
              class="docs__item"
              :data-testid="`document-row-${doc.id}`"
            >
              <span class="docs__meta">
                <strong>{{ doc.originalFilename }}</strong>
                <span class="docs__sub">
                  {{ formatFileSize(doc.fileSize) }}
                  <template v-if="doc.uploadedBy">
                    ·
                    {{ doc.uploadedBy.firstName }}
                    {{ doc.uploadedBy.lastName }}
                  </template>
                  · {{ new Date(doc.createdAt).toLocaleDateString() }}
                </span>
              </span>
              <span class="docs__actions">
                <Button
                  label="Download"
                  severity="secondary"
                  :data-testid="`document-download-${doc.id}`"
                  :disabled="busy"
                  @click="onDownload(doc)"
                />
                <Button
                  v-if="showUpload"
                  label="Delete"
                  severity="danger"
                  :data-testid="`document-delete-${doc.id}`"
                  :disabled="busy"
                  @click="onDelete(doc)"
                />
              </span>
            </li>
          </ul>
        </section>
      </template>
      <p v-else class="docs__empty" data-testid="documents-empty">
        No documents yet.
      </p>
    </template>
  </Card>
</template>

<style scoped>
.docs__error {
  color: var(--danger-text);
  margin: 0 0 0.75rem;
}
.docs__notice {
  color: var(--success);
  background: var(--success-soft);
  border: 1px solid var(--success-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
  margin: 0 0 0.75rem;
}
.docs__gate {
  color: var(--warn-text);
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
  margin: 0 0 0.75rem;
}
.docs__form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.docs__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.docs__field input,
.docs__field select {
  font: inherit;
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text-strong);
  background: var(--surface);
}
.docs__group {
  margin-bottom: 0.85rem;
}
.docs__group-title {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
  color: var(--gray-700);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.docs__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.docs__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem;
  border: 1px solid var(--line);
  border-radius: 6px;
}
.docs__meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.docs__sub {
  color: var(--muted);
  font-size: 0.85em;
}
.docs__actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.docs__empty {
  margin: 0;
  color: var(--muted);
}
</style>
