<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="ui-card">
    <h3 v-if="title" class="ui-card__title">{{ title }}</h3>
    <div class="ui-card__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ui-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 1rem;
  background: var(--surface);
}
.ui-card__title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}
.ui-card__body {
  color: var(--gray-700);
}
</style>
