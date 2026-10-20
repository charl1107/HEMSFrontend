<script setup lang="ts">
import Button from './Button.vue'
import ConflictWarningBanner from './ConflictWarningBanner.vue'

defineProps<{
  message: string
  conflictTitle: string
  conflictVenue: string
  conflictDate: string
  busy?: boolean
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}
</script>

<template>
  <div class="ui-override-modal">
    <div
      class="ui-override-modal__panel"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ui-override-modal-title"
      data-testid="conflict-override-modal"
    >
      <h2 id="ui-override-modal-title" class="ui-override-modal__title">
        Scheduling conflict
      </h2>
      <ConflictWarningBanner :message="message" />
      <dl class="ui-override-modal__details">
        <div class="ui-override-modal__row">
          <dt>Conflicting event</dt>
          <dd data-testid="conflict-event-title">{{ conflictTitle }}</dd>
        </div>
        <div class="ui-override-modal__row">
          <dt>Venue</dt>
          <dd data-testid="conflict-venue">{{ conflictVenue }}</dd>
        </div>
        <div class="ui-override-modal__row">
          <dt>Date</dt>
          <dd data-testid="conflict-date">{{ formatDate(conflictDate) }}</dd>
        </div>
      </dl>
      <p class="ui-override-modal__warn" data-testid="conflict-override-warning">
        Approving will override this conflict. The override is recorded in the audit log.
      </p>
      <div class="ui-override-modal__actions">
        <Button
          label="Cancel"
          severity="secondary"
          data-testid="override-cancel"
          :disabled="busy"
          @click="$emit('cancel')"
        />
        <Button
          label="Approve with override"
          severity="danger"
          data-testid="override-confirm"
          :disabled="busy"
          @click="$emit('confirm')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-override-modal {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}
.ui-override-modal__panel {
  background: var(--surface);
  border-radius: 8px;
  padding: 1.25rem;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.18);
}
.ui-override-modal__title {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
  color: var(--text-strong);
}
.ui-override-modal__details {
  margin: 0 0 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.ui-override-modal__row {
  display: flex;
  gap: 0.5rem;
}
.ui-override-modal__row dt {
  color: var(--muted);
  min-width: 9rem;
}
.ui-override-modal__row dd {
  margin: 0;
  color: var(--text-strong);
  font-weight: 500;
}
.ui-override-modal__warn {
  margin: 0 0 1rem;
  color: var(--warn-text);
  font-size: 0.9em;
}
.ui-override-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
