<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth.store'
import logoUrl from '@/assets/hospitality_logo.svg'

const auth = useAuthStore()
const year = new Date().getFullYear()

const STAFF_ROLES = [
  'Department Head',
  'Event Coordinator',
  'Instructor',
  'Student Officer',
  'Admin',
]

const dashboardRouteName = computed(() => {
  const isStaff = auth.roles.some((role) => STAFF_ROLES.includes(role))
  return isStaff ? 'dashboard' : 'student-dashboard'
})
</script>

<template>
  <div class="public-layout">
    <header class="public-bar">
      <RouterLink :to="{ name: 'public-events' }" class="public-bar__brand">
        <img :src="logoUrl" alt="HEMS logo" class="public-bar__logo" />
        <span class="public-bar__wordmark"><strong>HEMS</strong><small>Hospitality Management</small></span>
      </RouterLink>
      <nav class="public-bar__nav">
        <RouterLink :to="{ name: 'public-events' }">Events</RouterLink>
        <template v-if="auth.isAuthenticated">
          <RouterLink :to="{ name: dashboardRouteName }">Dashboard</RouterLink>
          <RouterLink v-if="auth.roles.includes('Student')" :to="{ name: 'my-attendance' }">My Attendance</RouterLink>
          <span class="public-bar__user">{{ auth.user?.firstName || auth.user?.email }}</span>
        </template>
        <template v-else>
          <RouterLink to="/login">Sign in</RouterLink>
        </template>
      </nav>
    </header>
    <RouterView />
    <footer class="public-footer">© {{ year }} HEMS</footer>
  </div>
</template>

<style scoped>
.public-layout {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  width: 100%;
  text-align: left;
}
.public-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--rose-line);
  background: var(--glass-80);
}
.public-bar__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
}
.public-bar__logo { width: 2.2rem; height: 2.2rem; object-fit: contain; border-radius: 50%; }
.public-bar__wordmark { display: flex; flex-direction: column; line-height: 1.1; }
.public-bar__wordmark small { color: var(--brand-text); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em; }
.public-bar__nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.public-bar__nav a { color: var(--muted-plum); text-decoration: none; }
.public-bar__nav a.router-link-active { color: var(--brand-text); }
.public-bar__user {
  font-size: 0.9em;
  color: var(--muted-plum);
}
.public-footer {
  margin-top: auto;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--rose-line);
  color: var(--muted-plum);
  font-size: 0.9em;
}
@media (max-width: 640px) {
  .public-bar { flex-wrap: wrap; padding: 0.65rem 0.85rem; }
  .public-bar__nav { flex: 1 1 100%; justify-content: flex-start; flex-wrap: wrap; gap: 0.75rem; }
  .public-bar__user { display: none; }
}
</style>
