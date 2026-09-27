<script setup lang="ts">
defineProps<{
  online: boolean
  pending: number
}>()
</script>

<template>
  <span
    class="ui-offline-badge"
    :class="{
      'ui-offline-badge--offline': !online,
      'ui-offline-badge--pending': pending > 0,
    }"
    role="status"
    data-testid="offline-badge"
  >
    {{ online ? 'Online' : 'Offline'
    }}<template v-if="pending > 0"> · {{ pending }} pending</template>
  </span>
</template>

<style scoped>
.ui-offline-badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8em;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  background: var(--success-soft);
  color: var(--success);
  border: 1px solid var(--success-line);
}
.ui-offline-badge--offline {
  background: var(--danger-soft);
  color: var(--danger-strong);
  border-color: var(--danger-line);
}
.ui-offline-badge--pending {
  background: var(--warn-soft);
  color: var(--warn-text);
  border-color: var(--warn-line);
}
.ui-offline-badge--offline.ui-offline-badge--pending {
  background: var(--danger-soft);
  color: var(--danger-strong);
  border-color: var(--danger-line);
}
</style>
