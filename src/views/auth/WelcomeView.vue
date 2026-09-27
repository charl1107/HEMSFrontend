<script setup lang="ts">
import logoUrl from '@/assets/hospitality_logo.svg'
</script>

<template>
  <main class="welcome">
    <div class="welcome__content">
      <div class="welcome__logo-wrap">
        <img :src="logoUrl" alt="HEMS hospitality logo" class="welcome__logo" />
      </div>
      <p class="welcome__eyebrow">Hospitality Management</p>
      <h1>Your campus events, activities, and attendance — all in one place.</h1>
      <RouterLink class="welcome__sign-in" to="/sign-in">Sign in</RouterLink>
    </div>
  </main>
</template>

<style scoped>
.welcome {
  display: grid;
  min-height: 100svh;
  place-items: center;
  box-sizing: border-box;
  padding: 1.5rem;
  background: radial-gradient(circle at 35% 25%, #471131 0%, #1e131d 60%, #120911 100%);
  color: #fdf2f8;
}

.welcome__content {
  display: flex;
  width: min(100%, 30rem);
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.welcome__logo-wrap {
  display: grid;
  width: min(18rem, 62vw);
  aspect-ratio: 1;
  place-items: center;
  padding: 1.25rem;
  box-sizing: border-box;
  border-radius: 2rem;
  background: rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 25px 60px rgba(20, 10, 17, 0.35);
}

.welcome__logo { width: 100%; height: 100%; object-fit: contain; }
.welcome__eyebrow { margin: 0; color: #f9a8d4; font-size: 0.76rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
.welcome h1 { max-width: 26rem; margin: 0; font-size: clamp(1.35rem, 5vw, 1.9rem); line-height: 1.25; }
.welcome__sign-in {
  display: inline-flex;
  min-width: 10rem;
  min-height: 2.8rem;
  align-items: center;
  justify-content: center;
  margin-top: 0.35rem;
  padding: 0 1.25rem;
  border-radius: 0.7rem;
  background: linear-gradient(135deg, #db2777 0%, #be185d 100%);
  color: #fff;
  font-weight: 700;
  text-decoration: none;
}
.welcome__sign-in:focus-visible { outline: 3px solid #f9a8d4; outline-offset: 3px; }

@media (min-width: 900px) {
  .welcome__content { width: min(100%, 34rem); gap: 1.5rem; }
  .welcome__logo-wrap { width: min(22rem, 72%); }
  .welcome h1 { font-size: clamp(1.6rem, 2.1vw, 2.3rem); }
}
</style>
