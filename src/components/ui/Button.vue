<script setup lang="ts">
defineProps<{
  label?: string
  disabled?: boolean
  severity?: 'primary' | 'secondary' | 'danger'
  type?: 'button' | 'submit' | 'reset'
}>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    class="ui-button"
    :class="`ui-button--${severity ?? 'primary'}`"
    :disabled="disabled"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.ui-button {
  font: inherit;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
}
.ui-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ui-button--primary {
  background: var(--accent-btn);
  color: #fff;
}
.ui-button--secondary {
  background: var(--fill);
  color: var(--text-strong);
}
.ui-button--danger {
  background: var(--danger-btn);
  color: #fff;
}
</style>
