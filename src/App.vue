<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/auth.store'

const auth = useAuthStore()

onMounted(() => {
  void auth.ensureRestored()
})
</script>

<template>
  <RouterView v-if="auth.ready" />
  <p v-else class="app-loading">Loading…</p>
</template>

<style scoped>
.app-loading {
  padding: 2rem;
  text-align: center;
}
</style>
