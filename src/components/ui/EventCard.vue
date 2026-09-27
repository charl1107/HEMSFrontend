<script setup lang="ts">
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{
  title: string
  eventDate?: string | null
  venue?: string | null
  department?: string | null
  campusScope?: 'OnCampus' | 'OffCampus' | null
  status?: string | null
  description?: string | null
  coverImageUrl?: string | null
  coverSrc?: string | null
}>()

function formatDate(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function currentCover(): string | undefined {
  return props.coverSrc ?? props.coverImageUrl ?? undefined
}
</script>

<template>
  <article class="ui-event-card" data-testid="event-card">
    <div class="ui-event-card__media">
      <img
        v-if="currentCover()"
        class="ui-event-card__cover"
        :src="currentCover()"
        :alt="`${title} cover`"
      />
      <div
        v-else
        class="ui-event-card__placeholder"
        data-testid="event-cover-placeholder"
        aria-hidden="true"
      >
        <span>No cover image</span>
      </div>
    </div>
    <div class="ui-event-card__body">
      <div class="ui-event-card__meta">
        <StatusBadge v-if="status" :status="status" />
        <time v-if="eventDate" :datetime="eventDate">{{ formatDate(eventDate) }}</time>
      </div>
      <h3 class="ui-event-card__title">{{ title }}</h3>
      <p v-if="description" class="ui-event-card__description">{{ description }}</p>
      <p v-if="venue" class="ui-event-card__venue">
        {{ venue }}<span v-if="campusScope"> · {{ campusScope === 'OnCampus' ? 'Inside campus' : 'Outside campus' }}</span>
      </p>
      <p v-if="department" class="ui-event-card__department">{{ department }}</p>
      <div class="ui-event-card__actions">
        <slot />
      </div>
    </div>
  </article>
</template>

<style scoped>
.ui-event-card {
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  text-align: left;
}
.ui-event-card__media {
  aspect-ratio: 16 / 9;
  background: var(--fill-soft);
}
.ui-event-card__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ui-event-card__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-400);
  font-size: 0.9rem;
  background: repeating-linear-gradient(
    45deg,
    var(--fill-soft),
    var(--fill-soft) 12px,
    var(--fill) 12px,
    var(--fill) 24px
  );
}
.ui-event-card__body {
  padding: 0.85rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.ui-event-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--muted);
  font-size: 0.9em;
}
.ui-event-card__title {
  margin: 0;
  font-size: 1.05rem;
  color: var(--text-strong);
}
.ui-event-card__venue {
  margin: 0;
  color: var(--muted);
  font-size: 0.95em;
}
.ui-event-card__description {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--muted-plum);
  font-size: 0.92rem;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.ui-event-card__department {
  margin: 0;
  color: var(--brand-text);
  font-size: 0.82rem;
  font-weight: 700;
}
.ui-event-card__actions {
  margin-top: 0.5rem;
}
</style>
