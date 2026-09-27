// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useThemeStore } from './theme.store'

function stubSystemTheme(dark: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: dark } as MediaQueryList),
  )
}

describe('theme.store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    stubSystemTheme(false)
    setActivePinia(createPinia())
  })

  it('uses the stored preference', () => {
    localStorage.setItem('hems-theme', 'dark')
    expect(useThemeStore().theme).toBe('dark')
  })

  it('prefers the stored value over the system preference', () => {
    stubSystemTheme(true)
    localStorage.setItem('hems-theme', 'light')
    expect(useThemeStore().theme).toBe('light')
  })

  it('falls back to the system preference when nothing is stored', () => {
    stubSystemTheme(true)
    expect(useThemeStore().theme).toBe('dark')
  })

  it('falls back to light when the system prefers light', () => {
    stubSystemTheme(false)
    expect(useThemeStore().theme).toBe('light')
  })

  it('ignores an invalid stored value', () => {
    stubSystemTheme(true)
    localStorage.setItem('hems-theme', 'blue')
    expect(useThemeStore().theme).toBe('dark')
  })

  it('toggles the theme and persists the choice', () => {
    const store = useThemeStore()
    expect(store.theme).toBe('light')
    store.toggle()
    expect(store.theme).toBe('dark')
    expect(localStorage.getItem('hems-theme')).toBe('dark')
    store.toggle()
    expect(store.theme).toBe('light')
    expect(localStorage.getItem('hems-theme')).toBe('light')
  })
})
