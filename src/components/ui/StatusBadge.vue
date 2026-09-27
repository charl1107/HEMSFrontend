<script setup lang="ts">
defineProps<{
  status: string
}>()

const tones: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  PendingApproval: 'bg-amber-100 text-amber-800',
  RevisionRequired: 'bg-orange-100 text-orange-800',
  Approved: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-red-100 text-red-800',
  Planning: 'bg-sky-100 text-sky-800',
  Ongoing: 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-neutral-200 text-neutral-700',
}
</script>

<template>
  <span
    class="ui-status-badge"
    :class="tones[status] ?? 'bg-gray-100 text-gray-700'"
    data-testid="status-badge"
  >
    {{ status }}
  </span>
</template>

<style scoped>
.ui-status-badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.8em;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}
</style>
