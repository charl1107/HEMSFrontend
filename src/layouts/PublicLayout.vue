<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth.store'

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
      <RouterLink :to="{ name: 'public-events' }" class="public-bar__brand">HEMS</RouterLink>
      <nav class="public-bar__nav">
        <RouterLink :to="{ name: 'public-events' }">Events</RouterLink>
        <template v-if="auth.isAuthenticated">
          <RouterLink :to="{ name: dashboardRouteName }">Dashboard</RouterLink>
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
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
.public-bar__brand {
  font-weight: 600;
  color: #08060d;
  text-decoration: none;
}
.public-bar__nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.public-bar__user {
  font-size: 0.9em;
  color: #6b7280;
}
.public-footer {
  margin-top: auto;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 0.9em;
}
</style>
