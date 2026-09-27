<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Card } from '@/components/ui'
import { createUser } from '../../../api/users.api'
import {
  hasStudentFieldErrors,
  toCreateUserPayload,
  validateStudentForm,
  type StudentFieldErrors,
  type StudentFormValues,
} from './student-form'

const router = useRouter()

const values = ref<StudentFormValues>({
  studentId: '',
  firstName: '',
  lastName: '',
  email: '',
  program: '',
  yearLevel: '',
  password: '',
  confirmPassword: '',
  isActive: true,
})
const errors = ref<StudentFieldErrors>({})
const formError = ref<string | null>(null)
const saving = ref(false)

async function onSubmit() {
  if (saving.value) return
  formError.value = null
  errors.value = validateStudentForm(values.value)
  if (hasStudentFieldErrors(errors.value)) return
  saving.value = true
  try {
    await createUser(toCreateUserPayload(values.value))
    await router.push({ name: 'admin-users' })
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Failed to create student'
  } finally {
    saving.value = false
  }
}

function onStatusChange(event: Event) {
  values.value.isActive = (event.target as HTMLSelectElement).value === 'true'
}
</script>

<template>
  <main class="add-student">
    <form
      class="add-student__form"
      data-testid="add-student-form"
      @submit.prevent="onSubmit"
    >
      <header class="add-student__header">
        <p class="add-student__eyebrow">Students</p>
        <h1 class="add-student__title">Add Student</h1>
        <p class="add-student__intro">Create a new student account</p>
      </header>

      <p
        v-if="formError"
        class="add-student__error"
        data-testid="add-student-error"
        role="alert"
      >
        {{ formError }}
      </p>

      <Card>
        <fieldset class="add-student__section" :disabled="saving">
          <legend class="add-student__legend">Student Information</legend>

          <label class="add-student__field">
            <span class="add-student__label">Student ID</span>
            <input
              v-model="values.studentId"
              class="add-student__input"
              data-testid="studentId"
              type="text"
              name="studentId"
              autocomplete="off"
              :aria-invalid="Boolean(errors.studentId)"
            />
            <span
              v-if="errors.studentId"
              class="add-student__field-error"
              data-testid="error-studentId"
            >
              {{ errors.studentId }}
            </span>
          </label>

          <div class="add-student__row">
            <label class="add-student__field">
              <span class="add-student__label">First name</span>
              <input
                v-model="values.firstName"
                class="add-student__input"
                data-testid="firstName"
                type="text"
                name="firstName"
                autocomplete="off"
                :aria-invalid="Boolean(errors.firstName)"
              />
              <span
                v-if="errors.firstName"
                class="add-student__field-error"
                data-testid="error-firstName"
              >
                {{ errors.firstName }}
              </span>
            </label>

            <label class="add-student__field">
              <span class="add-student__label">Last name</span>
              <input
                v-model="values.lastName"
                class="add-student__input"
                data-testid="lastName"
                type="text"
                name="lastName"
                autocomplete="off"
                :aria-invalid="Boolean(errors.lastName)"
              />
              <span
                v-if="errors.lastName"
                class="add-student__field-error"
                data-testid="error-lastName"
              >
                {{ errors.lastName }}
              </span>
            </label>
          </div>

          <label class="add-student__field">
            <span class="add-student__label">Email</span>
            <input
              v-model="values.email"
              class="add-student__input"
              data-testid="email"
              type="email"
              name="email"
              autocomplete="off"
              :aria-invalid="Boolean(errors.email)"
            />
            <span
              v-if="errors.email"
              class="add-student__field-error"
              data-testid="error-email"
            >
              {{ errors.email }}
            </span>
          </label>

          <div class="add-student__row">
            <label class="add-student__field">
              <span class="add-student__label">Program / Course</span>
              <input
                v-model="values.program"
                class="add-student__input"
                data-testid="program"
                type="text"
                name="program"
                autocomplete="off"
                :aria-invalid="Boolean(errors.program)"
              />
              <span
                v-if="errors.program"
                class="add-student__field-error"
                data-testid="error-program"
              >
                {{ errors.program }}
              </span>
            </label>

            <label class="add-student__field">
              <span class="add-student__label">Year level</span>
              <select
                v-model="values.yearLevel"
                class="add-student__input"
                data-testid="yearLevel"
                name="yearLevel"
                :aria-invalid="Boolean(errors.yearLevel)"
              >
                <option value="" disabled>Select year level</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              <span
                v-if="errors.yearLevel"
                class="add-student__field-error"
                data-testid="error-yearLevel"
              >
                {{ errors.yearLevel }}
              </span>
            </label>
          </div>
        </fieldset>

        <fieldset class="add-student__section" :disabled="saving">
          <legend class="add-student__legend">Account Information</legend>

          <label class="add-student__field">
            <span class="add-student__label">Password</span>
            <input
              v-model="values.password"
              class="add-student__input"
              data-testid="password"
              type="password"
              name="password"
              autocomplete="new-password"
              :aria-invalid="Boolean(errors.password)"
            />
            <span
              v-if="errors.password"
              class="add-student__field-error"
              data-testid="error-password"
            >
              {{ errors.password }}
            </span>
          </label>

          <label class="add-student__field">
            <span class="add-student__label">Confirm password</span>
            <input
              v-model="values.confirmPassword"
              class="add-student__input"
              data-testid="confirmPassword"
              type="password"
              name="confirmPassword"
              autocomplete="new-password"
              :aria-invalid="Boolean(errors.confirmPassword)"
            />
            <span
              v-if="errors.confirmPassword"
              class="add-student__field-error"
              data-testid="error-confirmPassword"
            >
              {{ errors.confirmPassword }}
            </span>
          </label>
        </fieldset>

        <fieldset class="add-student__section" :disabled="saving">
          <legend class="add-student__legend">Account Status</legend>

          <label class="add-student__field">
            <span class="add-student__label">Status</span>
            <select
              class="add-student__input"
              data-testid="account-status"
              name="status"
              :value="String(values.isActive)"
              @change="onStatusChange"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
        </fieldset>
      </Card>

      <div class="add-student__actions">
        <RouterLink
          class="add-student__cancel"
          data-testid="add-student-cancel"
          to="/admin/users"
        >
          Cancel
        </RouterLink>
        <Button
          type="submit"
          label="Create Student"
          data-testid="create-student-submit"
          :disabled="saving"
        />
      </div>
    </form>
  </main>
</template>

<style scoped>
.add-student {
  padding: 1.5rem;
  background: var(--page);
  min-height: 100%;
}

.add-student__form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  max-width: 40rem;
  margin: 0 auto;
}

.add-student__header {
  margin-bottom: 0.25rem;
}

.add-student__eyebrow {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-text);
}

.add-student__title {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--slate-900);
}

.add-student__intro {
  margin: 0;
  color: var(--slate-600);
  line-height: 1.5;
}

.add-student__error {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--danger-line);
  border-radius: 8px;
  background: var(--danger-soft);
  color: var(--danger-strong);
  font-size: 0.9rem;
  line-height: 1.4;
}

.add-student__section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0 0 1rem;
  padding: 0;
  border: 0;
}

.add-student__section:last-child {
  margin-bottom: 0;
}

.add-student__legend {
  padding: 0;
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--slate-900);
}

.add-student__row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.add-student__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.add-student__label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--slate-700);
}

.add-student__input {
  font: inherit;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--slate-line-2);
  border-radius: 8px;
  background: var(--surface);
  color: var(--slate-900);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.add-student__input:hover {
  border-color: var(--slate-line);
}

.add-student__input:focus {
  border-color: var(--accent-line);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.add-student__input[aria-invalid='true'] {
  border-color: var(--danger-text);
}

.add-student__field-error {
  font-size: 0.85rem;
  color: var(--danger-strong);
  line-height: 1.4;
}

.add-student__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
}

.add-student__cancel {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--slate-600);
  text-decoration: none;
}

.add-student__cancel:hover {
  color: var(--accent-text);
}

@media (min-width: 640px) {
  .add-student__row {
    grid-template-columns: 1fr 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .add-student__input {
    transition: none;
  }
}
</style>
