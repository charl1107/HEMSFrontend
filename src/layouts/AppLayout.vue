<script setup lang="ts">
import { computed, ref } from 'vue'
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
const canBrowsePublicEvents = computed(() => auth.roles.includes('Student'))
const canViewReports = REPORT_ROLES.some((role) => auth.roles.includes(role))
const canOpenQueue = SUBMIT_EVENT_ROLES.some((role) => auth.roles.includes(role))
const canViewAttendance = computed(() => auth.roles.includes('Student'))

const initials = computed(() => {
  const email = auth.user?.email ?? 'User'
  const localPart = email.split('@')[0] ?? 'U'
  const pieces = localPart.split(/[._-]/).filter(Boolean)
  const first = pieces[0]?.[0] ?? 'U'
  const second = pieces[1]?.[0] ?? localPart[1] ?? 'A'
  return `${first}${second}`.toUpperCase()
})

const roleTag = computed(() => auth.user?.roles[0] ?? 'Member')
const headerUserName = computed(() => {
  const user = auth.user
  if (!user?.firstName) return user?.email ?? ''
  const lastInitial = user.lastName?.trim().charAt(0).toLocaleUpperCase()
  return lastInitial ? `${user.firstName} ${lastInitial}.` : user.firstName
})

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
    <header class="app-bar" :class="{ 'app-bar--menu-open': mobileOpen }">
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
            <span class="app-bar__title">HM PORTAL</span>
            <span class="app-bar__tag">Hospitality Management</span>
          </div>
        </div>
      </div>

      <nav
        class="app-bar__nav"
        :class="{ 'app-bar__nav--open': mobileOpen }"
        aria-label="Main navigation"
      >
        <RouterLink
          v-if="auth.isAuthenticated"
          class="app-bar__tab"
          active-class="app-bar__tab--active"
          :to="dashboardPath"
          @click="closeMobile"
        >
          Dashboard
        </RouterLink>
        <RouterLink
          v-if="canManageEvents || canBrowsePublicEvents || !auth.isAuthenticated"
          class="app-bar__tab"
          active-class="app-bar__tab--active"
          :to="canManageEvents ? { name: 'events-list' } : { name: 'public-events' }"
          data-testid="nav-events"
          @click="closeMobile"
        >
          {{ canManageEvents ? 'Events' : 'Events' }}
        </RouterLink>
        <RouterLink
          v-if="canViewAttendance"
          class="app-bar__tab"
          active-class="app-bar__tab--active"
          :to="{ name: 'my-attendance' }"
          data-testid="nav-my-attendance"
          @click="closeMobile"
        >
          My Attendance
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
        <button
          v-if="auth.isAuthenticated"
          type="button"
          class="app-bar__tab app-bar__signout"
          data-testid="logout"
          @click="onLogout"
        >Sign out</button>
      </nav>

      <div v-if="auth.isAuthenticated" class="app-bar__profile">
        <NotificationBell class="app-bar__bell" />
        <div class="app-bar__avatar" aria-label="User profile initial">{{ initials }}</div>
        <div class="app-bar__profile-meta">
          <span class="app-bar__user">{{ headerUserName }}</span>
          <span class="app-bar__role">{{ roleTag }}</span>
        </div>
        <button
          type="button"
          class="app-bar__theme"
          data-testid="theme-toggle"
          :aria-label="theme.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="theme.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-pressed="theme.theme === 'dark'"
          @click="theme.toggle()"
        >
          <svg v-if="theme.theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M20.9 13A8.5 8.5 0 0 1 11 3.1 8.5 8.5 0 1 0 20.9 13Z" /></svg>
        </button>
        <button
          type="button"
          class="app-bar__logout-tablet"
          data-testid="logout-tablet"
          @click="onLogout"
        >Sign out</button>
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
  padding: 1rem 1.5rem;
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
  width: 2.35rem;
  height: 2.35rem;
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
  padding: 0.62rem 0.95rem;
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
  width: 2.2rem;
  height: 2.2rem;
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

.app-bar__theme {
  display: grid;
  place-items: center;
  flex: 0 0 2.6rem;
  width: 2.6rem;
  height: 2.6rem;
  padding: 0;
  border: 1px solid var(--pink-line);
  border-radius: 50%;
  background: var(--surface);
  color: var(--brand-text);
  cursor: pointer;
}
.app-bar__theme svg { width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.app-bar__theme:hover { background: var(--rose-soft); }
.app-bar__theme:focus-visible, .app-bar__signout:focus-visible { outline: 2px solid var(--pink-line); outline-offset: 2px; }
.app-bar__signout { font: inherit; cursor: pointer; text-align: left; }
.app-bar__signout:hover { background: var(--rose-soft); color: var(--brand-text); }
.app-bar__logout-tablet { display: none; }

@media (max-width: 767px) {
  .app-bar--menu-open {
    z-index: 1000;
  }

  .app-bar {
    flex-wrap: wrap;
    justify-content: flex-start;
    column-gap: 0.75rem;
    row-gap: 0.1rem;
    padding: 0.45rem 0.75rem 0.5rem;
  }

  .app-bar__left {
    flex: 1 1 100%;
    min-height: 2.25rem;
  }

  .app-bar__hamburger {
    display: flex;
    flex: 0 0 auto;
  }

  .app-bar__nav {
    display: none;
    position: absolute;
    top: calc(100% + 1px);
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    border-radius: 0;
    border-top: none;
    border-left: none;
    border-right: none;
    border-bottom: 1px solid var(--rose-line);
    background: var(--page);
    opacity: 1;
    z-index: 1000;
    padding: 0.75rem;
    gap: 0.5rem;
    box-shadow: 0 0.75rem 1rem rgba(12, 8, 18, 0.24);
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
    display: flex;
    min-width: 0;
    max-width: min(38vw, 12rem);
    margin-right: 0;
  }

  .app-bar__user { max-width: 100%; font-size: 0.78rem; }
  .app-bar__role { font-size: 0.54rem; }

  .app-bar__profile {
    flex: 1 1 100%;
    min-height: 2.2rem;
    gap: 0.45rem;
    margin-left: 0;
    justify-content: flex-end;
  }

  .app-bar__avatar {
    flex: 0 0 2.1rem;
  }

  .app-bar__theme.ui-button,
  .app-bar__logout.ui-button {
    white-space: nowrap;
    padding: 0.48rem 0.7rem;
    font-size: 0.78rem;
  }
}

@media (max-width: 520px) {
  .app-bar {
    padding: 0.35rem 0.7rem 0.4rem;
  }

  .app-bar__brand {
    gap: 0.45rem;
  }

  .app-bar__logo {
    width: 1.9rem;
    height: 1.9rem;
  }

  .app-bar__tag {
    font-size: 0.55rem;
  }

  .app-bar__profile {
    width: auto;
  }

  .app-bar__profile-meta { max-width: 34vw; }
  .app-bar__role { display: inline-flex; font-size: 0.5rem; margin-top: 0.08rem; padding: 0.1rem 0.35rem; }

  .app-bar__theme.ui-button,
  .app-bar__logout.ui-button {
    flex: 1 1 0;
    max-width: 8rem;
    min-height: 2.25rem;
  }

}

@media (min-width: 768px) {
  .app-bar__logout-tablet {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.25rem;
    padding: 0.45rem 0.8rem;
    border: 1px solid var(--pink-line);
    border-radius: 999px;
    background: var(--surface);
    color: var(--muted-plum);
    font: inherit;
    font-size: 0.8rem;
    white-space: nowrap;
    cursor: pointer;
  }

  .app-bar__nav .app-bar__signout { display: none; }

  .app-bar__left { flex: 0 0 auto; }
  .app-bar__profile { gap: 0.6rem; }
  .app-bar__nav { gap: 0.25rem; }
  .app-bar__tab { padding: 0.48rem 0.65rem; }
}

@media (max-width: 767px) {
  .app-bar {
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    column-gap: 0.4rem;
    row-gap: 0.15rem;
    padding: 0.5rem 0.7rem;
  }

  .app-bar__left {
    flex: 0 1 auto;
    width: auto;
    min-height: 0;
    gap: 0.4rem;
  }

  .app-bar__brand { gap: 0.35rem; }
  .app-bar__hamburger { width: 1.8rem; height: 1.8rem; }
  .app-bar__logo { width: 2.1rem; height: 2.1rem; }
  .app-bar__title { font-size: 0.95rem; }
  .app-bar__tag { font-size: 0.53rem; }

  .app-bar__profile {
    display: flex;
    flex: 0 1 auto;
    align-items: center;
    gap: 0.35rem;
    width: auto;
    min-height: 0;
    margin-left: auto;
    justify-content: flex-end;
  }

  .app-bar__avatar { flex: 0 0 2.2rem; width: 2.2rem; height: 2.2rem; }
  .app-bar__profile-meta { max-width: 4.5rem; }
  .app-bar__user { font-size: 0.8rem; }
  .app-bar__role {
    display: inline-flex;
    font-size: 0.45rem;
    margin-top: 0.08rem;
    padding: 0.08rem 0.25rem;
  }

  .app-bar__theme { flex-basis: 2.3rem; width: 2.3rem; height: 2.3rem; }
  .app-bar__theme svg { width: 1.1rem; height: 1.1rem; }
}

</style>
