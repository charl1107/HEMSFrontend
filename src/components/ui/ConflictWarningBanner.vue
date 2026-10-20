<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <div
    class="ui-conflict-banner"
    role="alert"
    data-testid="conflict-warning"
  >
    <strong>Conflict warning:</strong>
    {{ message }}
  </div>
</template>

<style scoped>
.ui-conflict-banner {
  border: 1px solid var(--warn-line);
  background: var(--warn-soft);
  color: var(--warn-text);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
}
</style>
