import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'hems-theme'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function initialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return isTheme(stored) ? stored : systemTheme()
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(initialTheme())

  function toggle(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, theme.value)
  }

  return { theme, toggle }
})
