<script setup lang="ts">
import Button from './Button.vue'

withDefaults(
  defineProps<{
    open: boolean
    title?: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
  }>(),
  {
    title: 'Confirm',
    message: 'Are you sure?',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    destructive: false,
  },
)

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div v-if="open" class="confirm-dialog-backdrop" data-testid="confirm-dialog">
    <div class="confirm-dialog-box" role="dialog" aria-modal="true">
      <h3 class="confirm-dialog-title">{{ title }}</h3>
      <p class="confirm-dialog-message">{{ message }}</p>
      <div class="confirm-dialog-actions">
        <Button
          :label="cancelLabel"
          severity="secondary"
          data-testid="confirm-dialog-cancel"
          @click="emit('cancel')"
        />
        <Button
          :label="confirmLabel"
          :class="{ 'confirm-dialog-destructive': destructive }"
          data-testid="confirm-dialog-confirm"
          @click="emit('confirm')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  padding: 1rem;
}

.confirm-dialog-box {
  width: 100%;
  max-width: 24rem;
  background: var(--surface);
  border: 1px solid var(--rose-line);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.3);
}

.confirm-dialog-title {
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ink);
}

.confirm-dialog-message {
  margin: 0 0 1.25rem;
  font-size: 0.9rem;
  color: var(--muted-plum);
  line-height: 1.45;
}

.confirm-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.confirm-dialog-destructive.ui-button {
  background: #dc2626 !important;
  border-color: #b91c1c !important;
  color: #fff !important;
}

.confirm-dialog-destructive.ui-button:hover:not(:disabled) {
  background: #b91c1c !important;
}
</style>
