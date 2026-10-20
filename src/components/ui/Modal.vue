<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'

const props = withDefaults(defineProps<{ open: boolean; title?: string; maxWidth?: string; closeOnBackdrop?: boolean }>(), {
  title: '', maxWidth: '32rem', closeOnBackdrop: true,
})
const emit = defineEmits<{ close: [] }>()
let ownsScrollLock = false
const LOCK_KEY = '__hemsModalScrollLock'
type LockState = { count: number; originalOverflow: string }

function updateScrollLock(isOpen: boolean) {
  const root = document.documentElement as HTMLElement & { [LOCK_KEY]?: LockState }
  if (isOpen && !ownsScrollLock) {
    if (!root[LOCK_KEY]) root[LOCK_KEY] = { count: 0, originalOverflow: root.style.overflow }
    root[LOCK_KEY].count += 1
    root.style.overflow = 'hidden'
    ownsScrollLock = true
  } else if (!isOpen && ownsScrollLock) {
    const state = root[LOCK_KEY]
    if (state) {
      state.count = Math.max(0, state.count - 1)
      if (state.count === 0) {
        root.style.overflow = state.originalOverflow
        delete root[LOCK_KEY]
      }
    }
    ownsScrollLock = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) emit('close')
}
watch(() => props.open, updateScrollLock, { immediate: true })
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  updateScrollLock(false)
  window.removeEventListener('keydown', onKeydown)
})

function onBackdrop() { if (props.closeOnBackdrop) emit('close') }
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-modal-fade">
      <div v-if="open" class="ui-modal-backdrop" data-testid="ui-modal-backdrop" @mousedown.self="onBackdrop">
        <section class="ui-modal-box" role="dialog" aria-modal="true" :aria-label="title || undefined" :style="{ maxWidth }" data-testid="ui-modal">
          <header v-if="title || $slots.header" class="ui-modal-header">
            <slot name="header"><h2>{{ title }}</h2></slot>
            <button type="button" aria-label="Close" data-testid="ui-modal-close" @click="emit('close')">×</button>
          </header>
          <div class="ui-modal-body"><slot /></div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ui-modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.25rem; overflow-y: auto; background: rgb(20 12 20 / 50%); backdrop-filter: blur(6px); }
.ui-modal-box { width: 100%; max-height: calc(100vh - 2.5rem); overflow-y: auto; margin: auto; background: var(--surface); border: 1px solid var(--rose-line, var(--line)); border-radius: 1.1rem; box-shadow: 0 30px 60px -25px rgb(20 12 20 / 55%); }
.ui-modal-header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.25rem 1.5rem 1rem; background: var(--surface); border-bottom: 1px solid var(--rose-line, var(--line)); }
.ui-modal-header h2 { margin: 0; color: var(--text-strong); }
.ui-modal-header button { border: 0; background: transparent; color: var(--muted-plum, var(--muted)); font: inherit; font-size: 1.25rem; cursor: pointer; }
.ui-modal-header button:hover { color: var(--accent-text); }
.ui-modal-body { padding: 1.5rem; }
.ui-modal-fade-enter-active, .ui-modal-fade-leave-active { transition: opacity .16s ease; }
.ui-modal-fade-enter-from, .ui-modal-fade-leave-to { opacity: 0; }
@media (max-width: 600px) {
  .ui-modal-backdrop { align-items: flex-start; padding: 0.5rem; }
  .ui-modal-box { max-height: calc(100dvh - 1rem); border-radius: 0.8rem; }
  .ui-modal-header { padding: 0.9rem 1rem; }
  .ui-modal-body { padding: 0.9rem; }
}
@media (prefers-reduced-motion: reduce) { .ui-modal-fade-enter-active, .ui-modal-fade-leave-active { transition: none; } }
</style>
