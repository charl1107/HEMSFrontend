<script setup lang="ts">
defineProps<{
  items: { id: string; title: string; meta?: string; description?: string }[]
  emptyLabel?: string
}>()
</script>

<template>
  <ol v-if="items.length" class="ui-timeline" data-testid="timeline">
    <li
      v-for="item in items"
      :key="item.id"
      class="ui-timeline__item"
      data-testid="timeline-item"
    >
      <span class="ui-timeline__dot" aria-hidden="true" />
      <div class="ui-timeline__content">
        <div class="ui-timeline__head">
          <strong class="ui-timeline__title">{{ item.title }}</strong>
          <span v-if="item.meta" class="ui-timeline__meta">{{ item.meta }}</span>
        </div>
        <p v-if="item.description" class="ui-timeline__description">
          {{ item.description }}
        </p>
      </div>
    </li>
  </ol>
  <p v-else class="ui-timeline__empty" data-testid="timeline-empty">
    {{ emptyLabel ?? 'No entries yet.' }}
  </p>
</template>

<style scoped>
.ui-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.ui-timeline__item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}
.ui-timeline__dot {
  flex: none;
  width: 10px;
  height: 10px;
  margin-top: 0.4rem;
  border-radius: 999px;
  background: var(--accent-btn);
}
.ui-timeline__content {
  flex: 1;
  min-width: 0;
}
.ui-timeline__head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
}
.ui-timeline__title {
  color: var(--text-strong);
}
.ui-timeline__meta {
  color: var(--muted);
  font-size: 0.85em;
}
.ui-timeline__description {
  margin: 0.25rem 0 0;
  color: var(--gray-700);
  font-size: 0.95em;
}
.ui-timeline__empty {
  margin: 0;
  color: var(--muted);
}
</style>
