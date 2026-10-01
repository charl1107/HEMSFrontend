<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  countUnread,
  listNotifications,
  markNotificationRead,
  type NotificationRecord,
} from '../api/notifications.api'

const notifications = ref<NotificationRecord[]>([])
const open = ref(false)
const loading = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const route = useRoute()

const unreadCount = computed(() => countUnread(notifications.value))

async function refresh(): Promise<void> {
  loading.value = true
  try {
    notifications.value = await listNotifications()
  } catch {
    // Leave prior list in place on transient failure.
  } finally {
    loading.value = false
  }
}

async function onMarkRead(notification: NotificationRecord): Promise<void> {
  if (notification.isRead) return
  try {
    const updated = await markNotificationRead(notification.id)
    const index = notifications.value.findIndex((n) => n.id === updated.id)
    if (index >= 0) {
      notifications.value[index] = updated
    }
  } catch {
    // Keep unread; next refresh will reconcile.
  }
}

function toggle(): void {
  open.value = !open.value
}

function onClickOutside(event: MouseEvent): void {
  if (!open.value) return
  if (root.value && !root.value.contains(event.target as Node)) {
    open.value = false
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) {
    open.value = false
    // Return focus to the control that opened the popover.
    trigger.value?.focus()
  }
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  void refresh()
})

// Listeners are active only while the popover is open, so a stray document
// click can never race the open/close toggle; always detach on unmount too.
watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', onClickOutside)
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('click', onClickOutside)
    document.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})

watch(
  () => route.fullPath,
  () => {
    void refresh()
  },
)

defineExpose({ refresh })
</script>

<template>
  <div ref="root" class="notification-bell">
    <button
      type="button"
      ref="trigger"
      class="notification-bell__trigger"
      aria-label="Notifications"
      data-testid="notification-bell"
      :aria-expanded="open"
      @click="toggle"
    >
      <svg class="notification-bell__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
      <span
        v-if="unreadCount > 0"
        class="notification-bell__badge"
        data-testid="notification-badge"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <div
      v-if="open"
      class="notification-bell__panel"
      role="dialog"
      aria-label="Notifications"
      data-testid="notification-panel"
    >
      <div class="notification-bell__header">
        <span>Notifications</span>
        <span v-if="loading" class="notification-bell__status">Loading…</span>
      </div>

      <p
        v-if="notifications.length === 0 && !loading"
        class="notification-bell__empty"
        data-testid="notification-empty"
      >
        No notifications yet.
      </p>

      <ul v-else class="notification-bell__list">
        <li
          v-for="n in notifications"
          :key="n.id"
          class="notification-bell__item"
          :class="{ 'notification-bell__item--unread': !n.isRead }"
        >
          <button
            type="button"
            class="notification-bell__item-button"
            data-testid="notification-item"
            :data-read="n.isRead ? 'true' : 'false'"
            @click="onMarkRead(n)"
          >
            <span class="notification-bell__message">{{ n.message }}</span>
            <span class="notification-bell__time">{{ formatTime(n.createdAt) }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.notification-bell {
  position: relative;
  display: inline-flex;
}

.notification-bell__trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--rose-soft);
  color: var(--brand-text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.notification-bell__trigger:hover {
  background: var(--rose-line);
  border-color: var(--pink-line);
}

/*
 * 44px hit area (touch target) without changing the visual 35px circle.
 */
.notification-bell__trigger::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--tap-min);
  height: var(--tap-min);
  transform: translate(-50%, -50%);
}

.notification-bell__icon {
  width: 1.05rem;
  height: 1.05rem;
}

.notification-bell__badge {
  position: absolute;
  top: -0.2rem;
  right: -0.2rem;
  min-width: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: var(--brand-strong-btn);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.1rem;
  text-align: center;
  box-shadow: 0 0 0 2px var(--badge-ring);
}

.notification-bell__panel {
  position: absolute;
  top: calc(100% + 0.55rem);
  right: 0;
  z-index: 50;
  width: 20rem;
  max-height: 24rem;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--rose-line);
  border-radius: 0.8rem;
  box-shadow: 0 18px 30px -20px rgba(30, 27, 36, 0.28);
}

.notification-bell__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid var(--rose-line);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ink);
}

.notification-bell__status {
  color: var(--muted);
  font-weight: 400;
  font-size: 0.8rem;
}

.notification-bell__empty {
  margin: 0;
  padding: 1rem 0.9rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.notification-bell__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notification-bell__item {
  border-bottom: 1px solid var(--line);
}

.notification-bell__item:last-child {
  border-bottom: none;
}

.notification-bell__item--unread {
  background: var(--rose-soft);
}

.notification-bell__item-button {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.75rem 0.9rem;
  border: none;
  background: transparent;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.notification-bell__message {
  font-size: 0.9rem;
  line-height: 1.45;
}

.notification-bell__time {
  font-size: 0.72rem;
  color: var(--muted);
}

@media (max-width: 767px) {
  /*
   * The phone header wraps into two rows, so the bell sits mid-row rather than
   * near the right edge. Right-anchoring a 20rem panel to the bell put its left
   * edge at -162 / -122 / -92 / -68px on 320 / 360 / 390 / 414px screens —
   * off-screen and unreachable. Anchor to the app bar instead (the nearest
   * positioned ancestor) and clamp the width to what the viewport allows.
   */
  .notification-bell {
    position: static;
  }

  .notification-bell__panel {
    right: 1.5rem; /* matches the app bar's mobile padding */
    max-width: calc(100% - 3rem);
  }
}
</style>
