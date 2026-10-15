<script setup lang="ts">
import { Card } from '@/components/ui'
import { useAuthStore } from '../../stores/auth.store'
import { EVENT_READ_ROLES } from '../../api/events.api'
import { formatUserDisplayName } from '../../utils/user-name'

const auth = useAuthStore()
const canBrowseWorkspace = EVENT_READ_ROLES.some((role) => auth.roles.includes(role))
</script>

<template>
  <main class="dashboard" data-testid="student-dashboard">
    <header class="dashboard__header">
      <p class="dashboard__eyebrow">Student</p>
      <h1 class="dashboard__title">Student dashboard</h1>
      <p class="dashboard__intro">Welcome{{ auth.user ? `, ${formatUserDisplayName(auth.user)}` : '' }}.</p>
    </header>

    <div
      v-if="auth.deniedPath"
      class="dashboard__denied"
      role="alert"
      data-testid="access-denied"
    >
      <span>You don't have access to that page.</span>
      <button
        type="button"
        class="dashboard__denied-dismiss"
        data-testid="access-denied-dismiss"
        @click="auth.clearDenied()"
      >
        Dismiss
      </button>
    </div>

    <Card title="Quick actions">
      <div class="dashboard__actions">
        <RouterLink
          class="dashboard__action"
          :to="{ name: 'public-events' }"
          data-testid="browse-events"
        >
          Browse all events
        </RouterLink>
        <RouterLink
          v-if="canBrowseWorkspace"
          class="dashboard__action dashboard__action--secondary"
          :to="{ name: 'events-list' }"
        >
          Manage events
        </RouterLink>
      </div>
    </Card>
  </main>
</template>

<style scoped>
.dashboard {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: var(--page);
  min-height: calc(100svh - 3.25rem);
}
.dashboard__header { max-width: 40rem; }
.dashboard__eyebrow {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brand-text);
}
.dashboard__title {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--slate-900);
}
.dashboard__intro { margin: 0; color: var(--slate-600); line-height: 1.5; }
.dashboard__actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.dashboard__action {
  display: inline-block;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand-strong-btn) 0%, var(--brand-btn) 100%);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
}
.dashboard__action:hover { filter: brightness(1.08); }
.dashboard__action--secondary {
  background: var(--surface);
  color: var(--slate-900);
  border: 1px solid var(--slate-line-2);
}
.dashboard__action--secondary:hover { border-color: var(--slate-line); background: var(--page); }
.dashboard__action:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(190, 24, 93, 0.2);
}

.dashboard__summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 1rem;
}
.dashboard__summary-box {
  padding: 1rem;
  border-radius: 8px;
  background: var(--page);
  border: 1px solid var(--rose-line);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.dashboard__summary-num {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--brand-strong-btn, #be185d);
}
.dashboard__summary-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--muted-plum);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
}

.dashboard__events-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.dashboard__event-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--rose-line);
  background: var(--surface);
}
.dashboard__event-name {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
}
.dashboard__event-sub {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted-plum);
}

.dashboard__attendance-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.dashboard__attendance-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 0.25rem;
  border-bottom: 1px solid var(--rose-line);
}
.dashboard__attendance-item:last-child {
  border-bottom: none;
}
.dashboard__attendance-left {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.dashboard__attendance-date {
  font-size: 0.8rem;
  color: var(--muted-plum);
}
.dashboard__empty-note {
  margin: 0;
  color: var(--muted-plum);
  font-style: italic;
  font-size: 0.9rem;
}
.dashboard__error {
  color: #dc2626;
  margin: 0;
}
.dashboard__denied {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0;
  padding: 0.65rem 0.9rem;
  background: var(--danger-soft);
  border: 1px solid var(--danger-line);
  color: var(--danger-strong);
  border-radius: 8px;
  font-size: 0.92rem;
}
.dashboard__denied-dismiss {
  font: inherit;
  font-weight: 600;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  border: 1px solid var(--danger-line);
  background: var(--surface);
  color: var(--danger-strong);
  cursor: pointer;
}
.dashboard__denied-dismiss:hover { filter: brightness(0.97); }
@media (prefers-reduced-motion: reduce) {
  .dashboard__action:hover { filter: none; }
  .dashboard__action--secondary:hover { background: var(--page); }
}
</style>
