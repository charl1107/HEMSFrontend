<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui'
import logoUrl from '@/assets/hospitality_logo.svg'
import { useAuthStore } from '../../stores/auth.store'
import { landingRoute } from '../../router/landing-route'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref<string | null>(null)
const loading = ref(false)

onMounted(() => {
  if (auth.isAuthenticated) {
    void router.replace(landingRoute(auth.roles))
  }
})

async function onSubmit() {
  if (loading.value) return
  error.value = null
  loading.value = true
  try {
    const target = await auth.login(email.value, password.value)
    await router.push(target)
  } catch (err) {
    error.value = isAxiosError(err) && err.response?.status === 401
      ? 'Incorrect email or password.'
      : err instanceof Error
        ? err.message
        : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login" :class="{ 'login--mobile-entry': route.name === 'login' }">
    <aside class="login__brand" aria-label="HEMS brand panel">
      <div class="login__brand-inner">
        <div class="login__logo-wrap">
          <img :src="logoUrl" alt="HEMS hospitality logo" class="login__logo" />
        </div>
        <div class="login__brand-copy-wrap">
          <p class="login__mark">Hospitality Management</p>
          <p class="login__brand-copy">
            Your campus events, activities, and attendance — all in one place.
          </p>
        </div>
        <RouterLink
          v-if="route.name === 'login'"
          class="login__brand-cta"
          :to="{ name: 'sign-in' }"
        >
          Sign in
        </RouterLink>
      </div>
    </aside>

    <section class="login__panel">
      <div class="login__panel-inner">
        <header class="login__header">
          <p class="login__product">HM PORTAL</p>
          <h1 class="login__title">Sign in</h1>
          <p class="login__intro">Use your campus email to continue.</p>
        </header>

        <form
          class="login__form"
          data-testid="login-form"
          @submit.prevent="onSubmit"
          @keyup.enter="onSubmit"
        >
          <label class="login__field">
            <span class="login__label">Email</span>
            <input
              v-model="email"
              class="login__input"
              data-testid="login-email"
              type="email"
              name="email"
              autocomplete="username"
              required
            />
          </label>

          <label class="login__field">
            <span class="login__label">Password</span>
            <div class="login__password-control">
              <input
                v-model="password"
                class="login__input"
                data-testid="login-password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="login__password-toggle"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
            <span
              v-if="error"
              class="login__error"
              data-testid="login-error"
              role="alert"
            >
              {{ error }}
            </span>
          </label>

          <Button
            class="login__submit"
            label="Sign in"
            data-testid="login-submit"
            :disabled="loading"
            @click="onSubmit"
          />
        </form>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: #f4f1f5;
}

.login__brand {
  display: none;
  background: radial-gradient(circle at 35% 25%, #471131 0%, #1e131d 60%, #120911 100%);
  color: #fdf2f8;
}

.login__brand-cta {
  display: none;
  min-width: 10rem;
  min-height: 2.8rem;
  align-items: center;
  justify-content: center;
  padding: 0 1.25rem;
  border-radius: 0.7rem;
  background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
  color: #fff;
  font-weight: 700;
  text-decoration: none;
}

.login__brand-inner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1.75rem;
  min-height: 100svh;
  box-sizing: border-box;
  padding: 2rem 1.5rem;
  text-align: center;
}

.login__logo-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(18rem, 62vw);
  aspect-ratio: 1;
  padding: 1.5rem;
  border-radius: 2rem;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 25px 60px rgba(20, 10, 17, 0.35);
}

.login__logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 16px 32px rgba(219, 39, 119, 0.25));
}

.login__brand-copy-wrap {
  max-width: 26rem;
}

.login__mark {
  margin: 0 0 0.8rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #f9a8d4;
}

.login__brand-copy {
  margin: 0;
  font-size: clamp(1.35rem, 5vw, 1.8rem);
  line-height: 1.2;
  font-weight: 600;
  color: #fdf2f8;
}

.login__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
  background: rgba(255, 255, 255, 0.7);
  min-height: 100svh;
  box-sizing: border-box;
}

.login__panel-inner {
  width: 100%;
  max-width: 25rem;
}

.login__header {
  margin-bottom: 1.75rem;
}

.login__product {
  margin: 0 0 1.1rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #db2777;
}

.login__title {
  margin: 0 0 0.5rem;
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #1e1b24;
}

.login__intro {
  margin: 0;
  color: #5f4f66;
  line-height: 1.5;
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.login__label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #3c3342;
}

.login__input {
  font: inherit;
  width: 100%;
  box-sizing: border-box;
  padding: 0.8rem 0.9rem;
  border: 1px solid #fce7f3;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #1e1b24;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.login__password-control { position: relative; width: 100%; }
.login__password-control .login__input { padding-right: 4rem; }
.login__password-toggle {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  border: 0;
  padding: 0.25rem;
  background: transparent;
  color: #be185d;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}
.login__password-toggle:focus-visible { outline: 2px solid #db2777; outline-offset: 2px; border-radius: 4px; }

.login__input:hover {
  border-color: #f9a8d4;
}

.login__input:focus {
  border-color: #db2777;
  box-shadow: 0 0 0 3px rgba(219, 39, 119, 0.18);
}

.login__error {
  margin: 0;
  padding: 0.75rem 0.8rem;
  border: 1px solid #fbcfe8;
  border-radius: 10px;
  background: #fef2f8;
  color: #be185d;
  font-size: 0.9rem;
  line-height: 1.4;
}

.login__submit {
  width: 100%;
  margin-top: 0.25rem;
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
}

.login__submit:active:not(:disabled) {
  transform: translateY(1px);
}

@media (min-width: 900px) {
  .login {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .login__brand {
    display: block;
  }

  .login__brand-inner {
    min-height: 100%;
    height: 100%;
    padding: 2.5rem;
  }

  .login__logo-wrap { width: min(22rem, 72%); }
  .login__brand-copy { font-size: clamp(1.6rem, 2.1vw, 2.3rem); }
  .login__panel {
    padding: 3rem 2.5rem;
  }
}

@media (max-width: 899px) {
  .login--mobile-entry .login__brand { display: block; }
  .login--mobile-entry .login__brand-inner { min-height: 100svh; }
  .login--mobile-entry .login__brand-cta { display: inline-flex; }
  .login--mobile-entry .login__panel { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .login__input {
    transition: none;
  }

  .login__submit:active:not(:disabled) {
    transform: none;
  }
}
</style>
