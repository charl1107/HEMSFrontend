<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui'
import { changePassword } from '../../api/auth.api'
import { useAuthStore } from '../../stores/auth.store'
import { landingRoute } from '../../router/landing-route'

const router = useRouter()
const auth = useAuthStore()

const newPassword = ref('')
const confirmPassword = ref('')
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const fieldErrors = ref<{ newPassword?: string; confirmPassword?: string }>({})
const error = ref<string | null>(null)
const loading = ref(false)

async function onSubmit() {
  if (loading.value) return
  error.value = null
  fieldErrors.value = {}

  if (newPassword.value.length < 8) {
    fieldErrors.value.newPassword = 'Password must be at least 8 characters.'
  }
  if (confirmPassword.value !== newPassword.value) {
    fieldErrors.value.confirmPassword = 'Passwords do not match.'
  }
  if (fieldErrors.value.newPassword || fieldErrors.value.confirmPassword) return

  loading.value = true
  try {
    await changePassword(undefined, newPassword.value)
    await auth.fetchMe()
    await router.push(landingRoute(auth.roles))
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 401) {
      error.value = 'Current password is incorrect.'
    } else {
      error.value = err instanceof Error ? err.message : 'Could not change password.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="change-password">
    <section class="change-password__panel">
      <div class="change-password__panel-inner">
        <header class="change-password__header">
          <p class="change-password__product">HEMS</p>
          <h1 class="change-password__title">Change your password</h1>
          <p class="change-password__intro">Set a new password before continuing.</p>
        </header>

        <form
          class="change-password__form"
          data-testid="change-password-form"
          @submit.prevent="onSubmit"
        >
          <label class="change-password__field">
            <span class="change-password__label">New password</span>
            <input
              v-model="newPassword"
              class="change-password__input"
              data-testid="new-password"
              :type="showNewPassword ? 'text' : 'password'"
              name="new-password"
              autocomplete="new-password"
              required
            />
            <button type="button" class="change-password__visibility" :aria-pressed="showNewPassword" @click="showNewPassword = !showNewPassword">
              {{ showNewPassword ? 'Hide password' : 'Show password' }}
            </button>
            <span
              v-if="fieldErrors.newPassword"
              class="change-password__field-error"
              data-testid="new-password-error"
            >
              {{ fieldErrors.newPassword }}
            </span>
          </label>

          <label class="change-password__field">
            <span class="change-password__label">Confirm new password</span>
            <input
              v-model="confirmPassword"
              class="change-password__input"
              data-testid="confirm-password"
              :type="showConfirmPassword ? 'text' : 'password'"
              name="confirm-password"
              autocomplete="new-password"
              required
            />
            <button type="button" class="change-password__visibility" :aria-pressed="showConfirmPassword" @click="showConfirmPassword = !showConfirmPassword">
              {{ showConfirmPassword ? 'Hide password' : 'Show password' }}
            </button>
            <span
              v-if="fieldErrors.confirmPassword"
              class="change-password__field-error"
              data-testid="confirm-password-error"
            >
              {{ fieldErrors.confirmPassword }}
            </span>
          </label>

          <p
            v-if="error"
            class="change-password__error"
            data-testid="change-password-error"
            role="alert"
          >
            {{ error }}
          </p>

          <Button
            class="change-password__submit"
            label="Change password"
            data-testid="change-password-submit"
            :disabled="loading"
            @click="onSubmit"
          />
        </form>
      </div>
    </section>
  </main>
</template>

<style scoped>
.change-password {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 2rem 1.25rem;
  background: var(--page);
}

.change-password__panel-inner {
  width: 100%;
  max-width: 24rem;
}

.change-password__header {
  margin-bottom: 1.75rem;
}

.change-password__product {
  margin: 0 0 1.25rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-text);
}

.change-password__title {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--slate-900);
}

.change-password__intro {
  margin: 0;
  color: var(--slate-600);
  line-height: 1.5;
}

.change-password__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.change-password__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.change-password__label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--slate-700);
}

.change-password__input {
  font: inherit;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--slate-line-2);
  border-radius: 8px;
  background: var(--surface);
  color: var(--slate-900);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.change-password__input:hover {
  border-color: var(--slate-line);
}

.change-password__input:focus {
  border-color: var(--accent-line);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.change-password__visibility {
  align-self: flex-end;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--accent-text);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.change-password__field-error {
  font-size: 0.85rem;
  color: var(--danger-strong);
}

.change-password__error {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--danger-line);
  border-radius: 8px;
  background: var(--danger-soft);
  color: var(--danger-strong);
  font-size: 0.9rem;
  line-height: 1.4;
}

.change-password__submit {
  width: 100%;
  margin-top: 0.25rem;
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  font-weight: 600;
}

.change-password__submit:active:not(:disabled) {
  transform: translateY(1px);
}

@media (prefers-reduced-motion: reduce) {
  .change-password__input {
    transition: none;
  }

  .change-password__submit:active:not(:disabled) {
    transform: none;
  }
}
</style>
