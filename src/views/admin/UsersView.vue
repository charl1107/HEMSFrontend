<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button, Card, Modal } from '@/components/ui'
import BulkImportStudents from './students/BulkImportStudents.vue'
import AddStudentView from './students/AddStudentView.vue'
import { listUsers, assignRole, removeRole as removeUserRole, ROLE_NAMES } from '../../api/users.api'
import { apiErrorMessage } from '../../api/http'
import type { SafeUser } from '../../api/auth.types'
import { formatUserDisplayName } from '../../utils/user-name'

const users = ref<SafeUser[]>([])
const pending = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const loading = ref(false)
const showImport = ref(false)
const showAddStudent = ref(false)
const notice = ref<string | null>(null)

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

function onImported(created: SafeUser[]) {
  notice.value = `${created.length} student${created.length === 1 ? '' : 's'} created successfully.`
  showImport.value = false
  void load()
}

function onStudentCreated(created: SafeUser) {
  notice.value = `${created.firstName} ${created.lastName} was added successfully.`
  showAddStudent.value = false
  void load()
}

function closeAddStudent(): void {
  showAddStudent.value = false
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
    error.value = apiErrorMessage(err, 'Failed to assign role')
  }
}

async function onRemoveRole(user: SafeUser, role: string) {
  error.value = null
  try {
    const updated = await removeUserRole(user.id, role)
    users.value = users.value.map((current) => current.id === updated.id ? updated : current)
  } catch (err) {
    error.value = apiErrorMessage(err, `Could not remove the ${role} role`)
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
        <div class="users__toolbar-actions">
        <Button
          class="users__add"
          label="Add Student"
          data-testid="add-student-link"
          @click="showAddStudent = true"
        />
        <Button
          class="users__bulk"
          label="Import CSV"
          data-testid="open-bulk-import"
          @click="showImport = true"
        />
        </div>
      </div>
      <p v-if="notice" class="users__notice" role="status">{{ notice }}</p>
      <p v-if="loading">Loading…</p>
      <template v-else>
        <p v-if="error" class="users__error" role="alert">{{ error }}</p>
        <div v-if="users.length" class="users__table-wrap">
        <table class="users__table">
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
            <td data-label="Email">{{ user.email }}</td>
            <td data-label="Name">{{ formatUserDisplayName(user) }}</td>
            <td data-label="Roles" class="users__roles-cell">
              <template v-for="role in user.roles" :key="role">
                <button
                  v-if="role !== 'Student' && role !== 'Admin'"
                  type="button"
                  class="users__role users__role--removable"
                  :data-testid="`remove-role-${user.email}-${role}`"
                  :aria-label="`Remove ${role} role from ${user.email}`"
                  @click="onRemoveRole(user, role)"
                >
                  {{ role }} <span aria-hidden="true">×</span>
                </button>
                <span
                  v-else
                  class="users__role"
                  :data-testid="`role-${role}`"
                  :title="role === 'Student' ? 'Student role cannot be removed' : 'Admin role is managed in the database'"
                >{{ role }}</span>
              </template>
            </td>
            <td data-label="Assign role" class="users__assign">
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
        </div>
        <p v-else-if="!error" class="users__empty" data-testid="users-empty">No users found.</p>
      </template>
    </Card>
    <Modal :open="showImport" title="Import students from CSV" @close="showImport = false">
      <BulkImportStudents @cancel="showImport = false" @imported="onImported" />
    </Modal>
    <Modal :open="showAddStudent" title="Add student" max-width="44rem" @close="closeAddStudent">
      <AddStudentView :overlay="true" @cancel="closeAddStudent" @created="onStudentCreated" />
    </Modal>
  </main>
</template>

<style scoped>
.users {
  padding: 1.5rem;
}
.users__table {
  width: 100%;
  min-width: 48rem;
  border-collapse: collapse;
  text-align: left;
}
.users__table-wrap { max-width: 100%; overflow-x: auto; overscroll-behavior-inline: contain; }
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
.users__role--removable {
  border: 0;
  font: inherit;
  font-size: 0.8em;
  cursor: pointer;
}
.users__role--removable:hover { filter: brightness(0.94); }
.users__assign {
  display: flex;
  flex-wrap: wrap;
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
.users__toolbar-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.65rem;
}
.users__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand-strong-btn) 0%, var(--brand-btn) 100%);
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 10px 25px -18px rgba(190, 24, 93, 0.9);
}
.users__bulk {
  flex: 0 0 auto;
}
.users__toolbar-actions :deep(.users__bulk) {
  border: 0;
  border-radius: 999px;
  padding: 0.7rem 1rem;
  background: linear-gradient(135deg, var(--brand-strong-btn) 0%, var(--brand-btn) 100%);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 10px 25px -18px rgba(190, 24, 93, 0.9);
}
.users__toolbar-actions :deep(.users__bulk:hover:not(:disabled)) {
  filter: brightness(1.05);
}
.users__notice { color: var(--success, #15803d); }
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
@media (max-width: 520px) {
  .users { padding: 0.75rem; }
  .users__toolbar { align-items: stretch; flex-direction: column; }
  .users__toolbar-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; gap: 0.5rem; }
  .users__toolbar-actions :deep(button) { width: 100%; min-width: 0; padding: 0.65rem 0.4rem; white-space: nowrap; }
  .users__table-wrap { overflow: visible; }
  .users__table { display: block; min-width: 0; }
  .users__table thead { display: none; }
  .users__table tbody { display: grid; gap: 0.75rem; }
  .users__table tr {
    display: block;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--rose-line);
    border-radius: 0.85rem;
    background: var(--surface);
  }
  .users__table td {
    display: grid;
    grid-template-columns: 5.2rem minmax(0, 1fr);
    align-items: start;
    gap: 0.5rem;
    padding: 0.45rem 0;
    border: 0;
    overflow-wrap: anywhere;
  }
  .users__table td::before {
    content: attr(data-label);
    color: var(--muted-plum);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .users__roles-cell { display: flex !important; flex-wrap: wrap; align-items: center !important; }
  .users__roles-cell::before { flex: 0 0 4.7rem; }
  .users__role { margin: 0 0.25rem 0.25rem 0; }
  .users__assign { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; }
  .users__assign select { min-width: 0; width: 100%; }
}
</style>
