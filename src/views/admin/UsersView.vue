<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button, Card } from '@/components/ui'
import { listUsers, assignRole, ROLE_NAMES } from '../../api/users.api'
import type { SafeUser } from '../../api/auth.types'

const users = ref<SafeUser[]>([])
const pending = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  error.value = null
  try {
    users.value = await listUsers()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load users'
  } finally {
    loading.value = false
  }
}

function setPending(userId: string, role: string) {
  pending.value = { ...pending.value, [userId]: role }
}

async function onAssign(user: SafeUser) {
  const role = pending.value[user.id]
  if (!role) return
  error.value = null
  try {
    const updated = await assignRole(user.id, role)
    users.value = users.value.map((u: SafeUser) => (u.id === updated.id ? updated : u))
    setPending(user.id, '')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to assign role'
  }
}

onMounted(load)
</script>

<template>
  <main class="users" data-testid="admin-users">
    <Card>
      <div class="users__toolbar">
        <div class="users__heading-wrap">
          <h3 class="users__heading">Users</h3>
        </div>
        <RouterLink
          class="users__add"
          to="/admin/students/new"
          data-testid="add-student-link"
        >
          Add Student
        </RouterLink>
      </div>
      <p v-if="loading">Loading…</p>
      <template v-else>
        <p v-if="error" class="users__error" role="alert">{{ error }}</p>
        <table v-if="users.length" class="users__table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Roles</th>
            <th>Assign role</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" :data-testid="`user-row-${user.email}`">
            <td>{{ user.email }}</td>
            <td>{{ user.firstName }} {{ user.lastName }}</td>
            <td>
              <span
                v-for="role in user.roles"
                :key="role"
                class="users__role"
                :data-testid="`role-${role}`"
              >
                {{ role }}
              </span>
            </td>
            <td class="users__assign">
              <select
                :value="pending[user.id] ?? ''"
                aria-label="Assign role"
                :data-testid="`assign-select-${user.email}`"
                @change="setPending(user.id, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">Select role…</option>
                <option
                  v-for="role in ROLE_NAMES"
                  :key="role"
                  :value="role"
                  :disabled="user.roles.includes(role)"
                >
                  {{ role }}
                </option>
              </select>
              <Button
                label="Assign"
                :data-testid="`assign-btn-${user.email}`"
                :disabled="!pending[user.id]"
                severity="secondary"
                @click="onAssign(user)"
              />
            </td>
          </tr>
        </tbody>
        </table>
        <p v-else-if="!error" class="users__empty" data-testid="users-empty">No users found.</p>
      </template>
    </Card>
  </main>
</template>

<style scoped>
.users {
  padding: 1.5rem;
}
.users__table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.users__table th,
.users__table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid var(--rose-line);
  color: var(--ink);
}
.users__table th {
  color: var(--muted-plum);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.users__role {
  display: inline-block;
  margin-right: 0.35rem;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: var(--rose-soft);
  color: var(--brand-text);
  font-size: 0.8em;
  font-weight: 700;
}
.users__assign {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.users__assign select {
  min-width: 10rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid var(--rose-line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
}
.users__error {
  color: var(--brand-text);
}
.users__empty {
  margin: 1.5rem 0;
  text-align: center;
  color: var(--muted-plum);
  font-size: 0.95rem;
}
.users__toolbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
  min-height: 2.75rem;
}
.users__heading-wrap {
  display: flex;
  align-items: center;
}
.users__heading {
  margin: 0;
  font-size: 1.25rem;
  color: var(--ink);
}
.users__add {
  position: absolute;
  right: 0;
  top: 0;
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand-strong-btn) 0%, var(--brand-btn) 100%);
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 10px 25px -18px rgba(190, 24, 93, 0.9);
}
.users__add:hover {
  transform: translateY(-1px);
}
.users__add:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(219, 39, 119, 0.18);
}
@media (prefers-reduced-motion: reduce) {
  .users__add:hover {
    transform: none;
  }
}
</style>
