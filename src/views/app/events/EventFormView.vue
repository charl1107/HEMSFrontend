<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Button, Card, ConfirmDialog, ConflictWarningBanner } from '@/components/ui'
import {
  createEvent,
  EVENT_CAMPUS_SCOPES,
  getEvent,
  isEditableStatus,
  removeCover,
  resolveCoverSrc,
  updateEvent,
  uploadCover,
  type EventMutationResult,
  type EventRecord,
} from '../../../api/events.api'
import {
  hasFieldErrors,
  precheckCoverFile,
  toEventPayload,
  validateEventForm,
  type EventFormValues,
  type FieldErrors,
} from './event-form'

const props = withDefaults(defineProps<{ overlay?: boolean; editId?: string }>(), {
  overlay: false,
  editId: undefined,
})

const emit = defineEmits<{
  submitted: [
    payload: {
      event: EventRecord
      conflictWarning: string | null
      coverError: string | null
    },
  ]
  cancel: []
}>()

const route = useRoute()

const isEdit = computed(
  () =>
    Boolean(props.editId) ||
    (!props.overlay && route.name === 'event-edit'),
)
const eventId = computed(() =>
  props.editId ??
  (!props.overlay && route.name === 'event-edit' ? String(route.params.id) : null),
)

const rootTag = computed(() => (props.overlay ? 'div' : 'main'))
const frameComponent = computed(() => (props.overlay ? 'div' : Card))

const values = ref<EventFormValues>({
  title: '',
  description: '',
  eventDate: '',
  venue: '',
  campusScope: 'OnCampus',
})
const errors = ref<FieldErrors>({})
const formError = ref<string | null>(null)
const conflictWarning = ref<string | null>(null)
const readOnlyNotice = ref<string | null>(null)
const loading = ref(false)
const saving = ref(false)
const existing = ref<EventRecord | null>(null)
const createdId = ref<string | null>(null)
const coverFile = ref<File | null>(null)
const coverError = ref<string | null>(null)
const coverNotice = ref<string | null>(null)
const coverUploading = ref(false)
const coverPreview = ref<string | null>(null)

const canEditExisting = computed(() =>
  existing.value ? isEditableStatus(existing.value.status) : true,
)

const coverDisplay = computed(() =>
  resolveCoverSrc(existing.value?.coverImageUrl ?? null),
)

watch(coverFile, (file) => {
  if (coverPreview.value) {
    URL.revokeObjectURL(coverPreview.value)
    coverPreview.value = null
  }
  if (file) {
    coverPreview.value = URL.createObjectURL(file)
  }
})

onUnmounted(() => {
  if (coverPreview.value) URL.revokeObjectURL(coverPreview.value)
})

function applyResult(result: EventMutationResult): void {
  conflictWarning.value = result.conflictWarning
}

async function loadExisting(): Promise<void> {
  if (!eventId.value) return
  loading.value = true
  formError.value = null
  readOnlyNotice.value = null
  try {
    const event = await getEvent(eventId.value)
    existing.value = event
    values.value = {
      title: event.title,
      description: event.description ?? '',
      eventDate: event.eventDate.slice(0, 10),
      venue: event.venue,
      campusScope: event.campusScope ?? 'OnCampus',
    }
    if (!isEditableStatus(event.status)) {
      readOnlyNotice.value = `Read-only: this event is not editable while status is ${event.status}.`
    }
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to load event'
  } finally {
    loading.value = false
  }
}

function onCoverChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  coverError.value = null
  coverNotice.value = null
  coverFile.value = null
  if (!file) return
  const check = precheckCoverFile(file)
  if (!check.ok) {
    coverError.value = check.message ?? 'Invalid cover image'
    input.value = ''
    return
  }
  coverFile.value = file
  coverNotice.value = `${file.name} ready to upload (${Math.ceil(file.size / 1024)} KB)`
}

async function onSubmit(): Promise<void> {
  errors.value = validateEventForm(values.value)
  formError.value = null
  conflictWarning.value = null
  if (hasFieldErrors(errors.value)) return
  if (!canEditExisting.value) {
    formError.value = 'This event cannot be edited in its current status.'
    return
  }

  saving.value = true
  try {
    const payload = toEventPayload(values.value)
    const targetId = isEdit.value ? eventId.value : createdId.value
    let result: EventMutationResult
    if (targetId) {
      result = await updateEvent(targetId, payload)
    } else if (props.overlay) {
      result = await createEvent(payload)
      createdId.value = result.id
    } else {
      formError.value = 'No event to update.'
      return
    }
    applyResult(result)
    existing.value = result

    let uploadError: string | null = null
    if (coverFile.value) {
      coverUploading.value = true
      try {
        existing.value = await uploadCover(result.id, coverFile.value)
        coverNotice.value = 'Cover image uploaded.'
        coverFile.value = null
      } catch (err) {
        uploadError = err instanceof Error ? err.message : 'Cover upload failed'
        coverError.value = uploadError
      } finally {
        coverUploading.value = false
      }
    }

    if (props.overlay) {
      emit('submitted', {
        event: result,
        conflictWarning: conflictWarning.value,
        coverError: uploadError,
      })
    }
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to save event'
  } finally {
    saving.value = false
  }
}

async function onRemoveCover(): Promise<void> {
  if (!eventId.value) return
  coverUploading.value = true
  coverError.value = null
  coverNotice.value = null
  try {
    existing.value = await removeCover(eventId.value)
    coverNotice.value = 'Cover image removed.'
  } catch (err) {
    coverError.value = err instanceof Error ? err.message : 'Failed to remove cover'
  } finally {
    coverUploading.value = false
  }
}

const pendingRemoveCover = ref(false)

function openDialog(): void {
  pendingRemoveCover.value = true
}

function cancelDialog(): void {
  pendingRemoveCover.value = false
}

async function confirmDialog(): Promise<void> {
  pendingRemoveCover.value = false
  await onRemoveCover()
}

onMounted(loadExisting)
</script>

<template>
  <component
    :is="rootTag"
    class="event-form"
    :class="{ 'event-form--overlay': overlay }"
    data-testid="event-form"
  >
    <div v-if="!overlay" class="event-form__header">
      <h1>{{ isEdit ? 'Edit event' : 'New event' }}</h1>
      <RouterLink :to="{ name: 'events-list' }" data-testid="back-to-events">← Back to events</RouterLink>
    </div>

    <component :is="frameComponent" class="event-form__frame">
      <p v-if="loading">Loading…</p>
      <template v-else>
        <ConflictWarningBanner v-if="conflictWarning" :message="conflictWarning" />
        <p v-if="formError" class="event-form__error" role="alert" data-testid="event-form-error">
          {{ formError }}
        </p>
        <p
          v-if="readOnlyNotice"
          class="event-form__readonly"
          role="status"
          data-testid="event-readonly"
        >
          {{ readOnlyNotice }}
        </p>

        <form class="event-form__fields" data-testid="event-form-fields" @submit.prevent="onSubmit">
          <label class="event-form__field">
            <span>Title *</span>
            <input
              v-model="values.title"
              type="text"
              class="event-form__input"
              data-testid="event-title"
              :aria-invalid="Boolean(errors.title)"
              :disabled="!canEditExisting || saving || coverUploading"
            />
            <span v-if="errors.title" class="event-form__field-error" data-testid="error-title">
              {{ errors.title }}
            </span>
          </label>

          <label class="event-form__field">
            <span>Event date *</span>
            <input
              v-model="values.eventDate"
              type="date"
              class="event-form__input"
              data-testid="event-date"
              :aria-invalid="Boolean(errors.eventDate)"
              :disabled="!canEditExisting || saving || coverUploading"
            />
            <span v-if="errors.eventDate" class="event-form__field-error" data-testid="error-eventDate">
              {{ errors.eventDate }}
            </span>
          </label>

          <label class="event-form__field">
            <span>Venue *</span>
            <input
              v-model="values.venue"
              type="text"
              class="event-form__input"
              data-testid="event-venue"
              :aria-invalid="Boolean(errors.venue)"
              :disabled="!canEditExisting || saving || coverUploading"
            />
            <span v-if="errors.venue" class="event-form__field-error" data-testid="error-venue">
              {{ errors.venue }}
            </span>
          </label>

          <label class="event-form__field">
            <span>Campus location</span>
            <select
              v-model="values.campusScope"
              class="event-form__input"
              data-testid="event-campus-scope"
              :disabled="!canEditExisting || saving || coverUploading"
            >
              <option v-for="scope in EVENT_CAMPUS_SCOPES" :key="scope" :value="scope">
                {{ scope === 'OnCampus' ? 'Inside campus' : 'Outside campus' }}
              </option>
            </select>
          </label>

          <label class="event-form__field">
            <span>Description</span>
            <textarea
              v-model="values.description"
              rows="4"
              class="event-form__input"
              data-testid="event-description"
              :disabled="!canEditExisting || saving || coverUploading"
            />
          </label>

          <fieldset class="event-form__cover" data-testid="cover-upload">
            <legend>Cover image</legend>
            <p class="event-form__hint">JPEG, PNG, or WebP · max 5MB</p>
            <img
              v-if="coverPreview"
              class="event-form__cover-preview"
              :src="coverPreview"
              alt="Selected cover preview"
            />
            <img
              v-else-if="coverDisplay"
              class="event-form__cover-preview"
              :src="coverDisplay"
              alt="Current cover"
              data-testid="current-cover"
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              data-testid="cover-input"
              :disabled="!canEditExisting || saving || coverUploading"
              @change="onCoverChange"
            />
            <p v-if="coverError" class="event-form__error" role="alert" data-testid="cover-error">
              {{ coverError }}
            </p>
            <p v-else-if="coverNotice" class="event-form__notice" data-testid="cover-notice">
              {{ coverNotice }}
            </p>
            <Button
              v-if="isEdit && existing?.coverImageUrl && canEditExisting"
              label="Remove cover"
              severity="secondary"
              data-testid="remove-cover"
              :disabled="coverUploading || saving"
              @click="openDialog"
            />
          </fieldset>

          <div class="event-form__actions">
            <Button
              v-if="overlay"
              label="Cancel"
              severity="secondary"
              data-testid="event-cancel"
              :disabled="saving || coverUploading"
              @click="emit('cancel')"
            />
            <Button
              type="submit"
              :label="
                saving
                  ? 'Saving…'
                  : isEdit
                    ? 'Save changes'
                    : 'Create event'
              "
              data-testid="event-submit"
              :disabled="!canEditExisting || saving || coverUploading"
            />
          </div>
        </form>

        <ConfirmDialog
          :open="pendingRemoveCover"
          title="Remove cover image"
          message="Remove the cover image from this event? This cannot be undone."
          confirm-label="Remove"
          cancel-label="Cancel"
          destructive
          @confirm="confirmDialog"
          @cancel="cancelDialog"
        />
      </template>
    </component>
  </component>
</template>

<style scoped>
.event-form {
  padding: 1.5rem;
  max-width: 640px;
}
.event-form--overlay {
  padding: 0;
}
.event-form--overlay .event-form__frame {
  border: none;
  padding: 0;
  background: transparent;
}
.event-form__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.event-form__fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.event-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.event-form__input {
  font: inherit;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--text-strong);
  background: var(--surface);
}
.event-form__input[aria-invalid='true'] {
  border-color: var(--danger-text);
}
.event-form__field-error,
.event-form__error {
  color: var(--danger-text);
  font-size: 0.9em;
}
.event-form__notice {
  color: var(--success);
  font-size: 0.9em;
}
.event-form__readonly {
  color: var(--warn-text);
  background: var(--warn-soft);
  border: 1px solid var(--warn-line);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9em;
}
.event-form__hint {
  color: var(--muted);
  font-size: 0.85em;
  margin: 0 0 0.5rem;
}
.event-form__cover {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.75rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  /* <fieldset> has an intrinsic min-width of min-content, which pushed this
     box past the viewport on 360px phones (file input + buttons cannot wrap). */
  min-width: 0;
  max-width: 100%;
}
.event-form__cover > :where(input, p, img, button) {
  max-width: 100%;
}
.event-form__cover-preview {
  max-width: 280px;
  border-radius: 6px;
  object-fit: cover;
}
.event-form__actions {
  display: flex;
  gap: 0.75rem;
}
</style>
