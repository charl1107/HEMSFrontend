<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui'
import { RouterLink, useRouter } from 'vue-router'
import logoUrl from '@/assets/hospitality_logo.svg'
import { useAuthStore } from '../stores/auth.store'
import { useThemeStore } from '../stores/theme.store'
import { EVENT_READ_ROLES, SUBMIT_EVENT_ROLES } from '../api/events.api'
import { REPORT_ROLES } from '../api/reports.api'
import NotificationBell from '../components/NotificationBell.vue'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const mobileOpen = ref(false)

const STAFF_ROLES = ['Department Head', 'Event Coordinator', 'Instructor', 'Student Officer', 'Admin']
const isStudentOnly = computed(() =>
  auth.roles.includes('Student') && !auth.roles.some((role) => STAFF_ROLES.includes(role)),
)
const dashboardPath = computed(() => (isStudentOnly.value ? '/student-dashboard' : '/dashboard'))

const canManageEvents = EVENT_READ_ROLES.some((role) => auth.roles.includes(role))
const canViewReports = REPORT_ROLES.some((role) => auth.roles.includes(role))
const canOpenQueue = SUBMIT_EVENT_ROLES.some((role) => auth.roles.includes(role))

const initials = computed(() => {
  const email = auth.user?.email ?? 'User'
  const localPart = email.split('@')[0] ?? 'U'
  const pieces = localPart.split(/[._-]/).filter(Boolean)
  const first = pieces[0]?.[0] ?? 'U'
  const second = pieces[1]?.[0] ?? localPart[1] ?? 'A'
  return `${first}${second}`.toUpperCase()
})

const roleTag = computed(() => auth.user?.roles[0] ?? 'Member')

async function onLogout() {
  await auth.logout()
  await router.push({ name: 'login' })
}

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

function closeMobile() {
  mobileOpen.value = false
}
</script>

<template>
  <div class="app-layout" :class="{ dark: theme.theme === 'dark' }">
    <header class="app-bar">
      <div class="app-bar__left">
        <button
          type="button"
          class="app-bar__hamburger"
          aria-label="Toggle navigation"
          :aria-expanded="mobileOpen"
          data-testid="mobile-nav-toggle"
          @click="toggleMobile"
        >
          <span class="app-bar__hamburger-line" />
          <span class="app-bar__hamburger-line" />
          <span class="app-bar__hamburger-line" />
        </button>

        <div class="app-bar__brand">
          <img :src="logoUrl" alt="HEMS logo" class="app-bar__logo" />
          <div class="app-bar__wordmark">
            <span class="app-bar__title">HEMS</span>
            <span class="app-bar__tag">Hospitality Ops</span>
          </div>
        </div>
      </div>

      <nav
        class="app-bar__nav"
        :class="{ 'app-bar__nav--open': mobileOpen }"
        aria-label="Main navigation"
      >
        <RouterLink
          class="app-bar__tab"
          active-class="app-bar__tab--active"
          :to="dashboardPath"
          @click="closeMobile"
        >
          Dashboard
        </RouterLink>
        <RouterLink
          v-if="canManageEvents"
          class="app-bar__tab"
          active-class="app-bar__tab--active"
          :to="{ name: 'events-list' }"
          data-testid="nav-events"
          @click="closeMobile"
        >
          Events
        </RouterLink>
        <RouterLink
          v-if="canOpenQueue"
          class="app-bar__tab"
          active-class="app-bar__tab--active"
          :to="{ name: 'approvals-queue' }"
          data-testid="nav-approvals"
          @click="closeMobile"
        >
          Review queue
        </RouterLink>
        <RouterLink
          v-if="canViewReports"
          class="app-bar__tab"
          active-class="app-bar__tab--active"
          :to="{ name: 'reports-dashboard' }"
          data-testid="nav-reports"
          @click="closeMobile"
        >
          Reports
        </RouterLink>
        <RouterLink
          v-if="auth.roles.includes('Admin')"
          class="app-bar__tab"
          active-class="app-bar__tab--active"
          to="/admin/users"
          @click="closeMobile"
        >
          Users
        </RouterLink>
        <RouterLink
          v-if="auth.roles.includes('Admin')"
          class="app-bar__tab"
          active-class="app-bar__tab--active"
          to="/admin/audit"
          data-testid="nav-audit"
          @click="closeMobile"
        >
          Audit
        </RouterLink>
      </nav>

      <div v-if="auth.isAuthenticated" class="app-bar__profile">
        <NotificationBell class="app-bar__bell" />
        <div class="app-bar__avatar" aria-label="User profile initial">{{ initials }}</div>
        <div class="app-bar__profile-meta">
          <span class="app-bar__user">{{ auth.user?.email }}</span>
          <span class="app-bar__role">{{ roleTag }}</span>
        </div>
        <Button
          label="Dark mode"
          class="app-bar__theme"
          data-testid="theme-toggle"
          :aria-pressed="theme.theme === 'dark'"
          @click="theme.toggle()"
        />
        <Button
          label="Sign out"
          severity="secondary"
          class="app-bar__logout"
          data-testid="logout"
          @click="onLogout"
        />
      </div>
    </header>
    <RouterView />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  width: 100%;
  text-align: left;
  color: var(--text-strong);
  background: var(--page);
}

.app-bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.4rem;
  border-bottom: 1px solid var(--rose-line);
  background: var(--glass-80);
  backdrop-filter: blur(10px);
}

.app-bar__left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-bar__hamburger {
  display: none;
  flex-direction: column;
  justify-content: space-around;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: 1px solid var(--rose-line);
  border-radius: 6px;
  padding: 0.3rem;
  cursor: pointer;
}

.app-bar__hamburger-line {
  width: 100%;
  height: 2px;
  background-color: var(--ink);
  border-radius: 2px;
  transition: all 0.2s ease;
}

.app-bar__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.app-bar__logo {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 0.7rem;
  object-fit: contain;
  background: var(--rose-soft);
  box-shadow: inset 0 0 0 1px rgba(219, 39, 119, 0.09);
}

.app-bar__wordmark {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.app-bar__title {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--ink);
}

.app-bar__tag {
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-text);
}

.app-bar__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.25rem;
  border-radius: 999px;
  background: var(--page);
  border: 1px solid var(--rose-line);
}

.app-bar__tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.58rem 0.9rem;
  border-radius: 999px;
  color: var(--muted-plum);
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease;
}

.app-bar__tab:hover {
  color: var(--brand-text);
}

.app-bar__tab--active {
  background: var(--surface);
  color: var(--brand-text);
  box-shadow: 0 2px 8px rgba(190, 24, 93, 0.08);
}

.app-bar__profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
}

.app-bar__bell {
  display: inline-flex;
}

.app-bar__avatar {
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--rose-soft) 0%, var(--rose-line) 100%);
  color: var(--brand-text);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  border: 1px solid var(--pink-line);
}

.app-bar__profile-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.app-bar__user {
  color: var(--ink);
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 14rem;
}

.app-bar__role {
  display: inline-flex;
  align-self: flex-start;
  margin-top: 0.12rem;
  padding: 0.18rem 0.45rem;
  border-radius: 999px;
  background: var(--rose-soft);
  border: 1px solid var(--pink-line);
  color: var(--brand-text);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.app-bar__theme.ui-button {
  padding: 0.55rem 1.05rem;
  border-radius: 999px;
  border: 1px solid var(--pink-line);
  background: var(--surface);
  color: var(--muted-plum);
  font-size: 0.85rem;
  font-weight: 600;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.app-bar__theme.ui-button:hover:not(:disabled) {
  background: var(--rose-soft);
  border-color: var(--pink-line);
  color: var(--brand-text);
}

.app-bar__theme.ui-button[aria-pressed='true'] {
  background: var(--rose-soft);
  border-color: var(--pink-line);
  color: var(--brand-text);
}

.app-bar__theme.ui-button:focus-visible {
  outline: none;
  border-color: var(--pink-line);
  box-shadow: 0 0 0 3px rgba(219, 39, 119, 0.18);
}

.app-bar__logout.ui-button {
  padding: 0.55rem 1.05rem;
  border-radius: 999px;
  border: 1px solid var(--pink-line);
  background: var(--surface);
  color: var(--muted-plum);
  font-size: 0.85rem;
  font-weight: 600;
  transition:
    color 0.15s ease,
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.app-bar__logout.ui-button:hover:not(:disabled) {
  background: var(--rose-soft);
  border-color: var(--pink-line);
  color: var(--brand-text);
}

.app-bar__logout.ui-button:focus-visible {
  outline: none;
  border-color: var(--pink-line);
  box-shadow: 0 0 0 3px rgba(219, 39, 119, 0.18);
}

.app-bar__logout.ui-button:disabled {
  opacity: 0.55;
}

@media (max-width: 767px) {
  .app-bar__hamburger {
    display: flex;
  }

  .app-bar__nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    border-radius: 0;
    border-top: none;
    border-left: none;
    border-right: none;
    border-bottom: 1px solid var(--rose-line);
    background: var(--surface);
    z-index: 50;
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .app-bar__nav--open {
    display: flex;
  }

  .app-bar__tab {
    width: 100%;
    justify-content: flex-start;
    padding: 0.75rem 1rem;
    border-radius: 8px;
  }

  .app-bar__profile-meta {
    display: none;
  }
}
</style>
