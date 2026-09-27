import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export function useOnlineStatus(): { online: Ref<boolean> } {
  const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

  function update(): void {
    online.value = navigator.onLine
  }

  onMounted(() => {
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  })

  return { online }
}
