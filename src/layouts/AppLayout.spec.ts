// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppLayout from './AppLayout.vue'
import { useAuthStore } from '../stores/auth.store'

vi.mock('../components/NotificationBell.vue', () => ({
  default: { template: '<div data-testid="bell-stub" />' },
}))

const stub = { template: '<div />' }

async function createTestRouter(): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: AppLayout,
        children: [
          { path: 'dashboard', name: 'dashboard', component: stub },
          { path: 'manage/events', name: 'events-list', component: stub },
          { path: 'reports', name: 'reports-dashboard', component: stub },
          { path: 'admin/users', name: 'admin-users', component: stub },
          { path: 'admin/audit', name: 'admin-audit', component: stub },
        ],
      },
    ],
  })
  await router.push('/dashboard')
  await router.isReady()
  return router
}

async function mountLayout(router: Router): Promise<VueWrapper> {
  const wrapper = mount({ template: '<RouterView />' }, {
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('AppLayout theme toggle', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false } as MediaQueryList),
    )
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.setSession('token', {
      id: 'u1',
      email: 'admin@hems.local',
      firstName: 'Ada',
      lastName: 'Admin',
      isActive: true,
      roles: ['Admin'],
      mustChangePassword: false,
    })
  })

  it('renders the dark mode toggle in the light state', async () => {
    const wrapper = await mountLayout(await createTestRouter())

    const toggle = wrapper.find('[data-testid="theme-toggle"]')
    expect(toggle.exists()).toBe(true)
    expect(toggle.attributes('aria-pressed')).toBe('false')
    // Icon-only toggle (SVG + aria-label/title), so the dark-mode intent lives
    // in the accessible name rather than in visible text.
    expect(toggle.attributes('aria-label')).toContain('dark mode')
    expect(toggle.attributes('title')).toContain('dark mode')
    expect(wrapper.find('.app-layout').classes()).not.toContain('dark')
  })

  it('toggles the dark class on the app shell and persists the choice', async () => {
    const wrapper = await mountLayout(await createTestRouter())
    const toggle = wrapper.find('[data-testid="theme-toggle"]')

    await toggle.trigger('click')

    expect(wrapper.find('.app-layout').classes()).toContain('dark')
    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(localStorage.getItem('hems-theme')).toBe('dark')

    await toggle.trigger('click')

    expect(wrapper.find('.app-layout').classes()).not.toContain('dark')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    expect(localStorage.getItem('hems-theme')).toBe('light')
  })

  it('applies a stored dark preference on first render', async () => {
    localStorage.setItem('hems-theme', 'dark')
    const wrapper = await mountLayout(await createTestRouter())

    expect(wrapper.find('.app-layout').classes()).toContain('dark')
    expect(
      wrapper.find('[data-testid="theme-toggle"]').attributes('aria-pressed'),
    ).toBe('true')
  })
})

describe('AppLayout nav scroll affordance', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false } as MediaQueryList),
    )
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.setSession('token', {
      id: 'u1',
      email: 'admin@hems.local',
      firstName: 'Ada',
      lastName: 'Admin',
      isActive: true,
      roles: ['Admin'],
      mustChangePassword: false,
    })
  })

  // happy-dom never computes layout (scrollWidth === clientWidth === 0), so the
  // overflow detection is driven by shadowing the geometry getters and
  // re-measuring through the component's own scroll listener.
  function mockNavMetrics(
    el: Element,
    scrollWidth: number,
    clientWidth: number,
    scrollLeft: number,
  ) {
    Object.defineProperty(el, 'scrollWidth', {
      value: scrollWidth,
      configurable: true,
    })
    Object.defineProperty(el, 'clientWidth', {
      value: clientWidth,
      configurable: true,
    })
    Object.defineProperty(el, 'scrollLeft', {
      value: scrollLeft,
      configurable: true,
    })
  }

  it('marks the nav scrollable and renders both edge fades when content overflows', async () => {
    const wrapper = await mountLayout(await createTestRouter())
    const nav = wrapper.find('.app-bar__nav')

    // Fitting strip (happy-dom 0/0): no affordance, no fades.
    expect(nav.classes()).not.toContain('is-scrollable')
    expect(wrapper.find('.app-bar__nav-fade--left').exists()).toBe(false)
    expect(wrapper.find('.app-bar__nav-fade--right').exists()).toBe(false)

    // Narrow container (600px of tabs in a 300px strip, scrolled to the start).
    mockNavMetrics(nav.element, 600, 300, 0)
    await nav.trigger('scroll')

    expect(nav.classes()).toContain('is-scrollable')
    // Both fades render while overflowing; per-edge visibility follows the
    // scrolled position — at scrollLeft 0 only the right edge hides content.
    const left = wrapper.find('.app-bar__nav-fade--left')
    const right = wrapper.find('.app-bar__nav-fade--right')
    expect(left.exists()).toBe(true)
    expect(right.exists()).toBe(true)
    expect(right.classes()).toContain('is-visible')
    expect(left.classes()).not.toContain('is-visible')
  })

  it('toggles each fade as the strip scrolls and clears them when it fits again', async () => {
    const wrapper = await mountLayout(await createTestRouter())
    const nav = wrapper.find('.app-bar__nav')

    // Mid-strip: content hidden past both edges.
    mockNavMetrics(nav.element, 600, 300, 150)
    await nav.trigger('scroll')
    expect(wrapper.find('.app-bar__nav-fade--left').classes()).toContain('is-visible')
    expect(wrapper.find('.app-bar__nav-fade--right').classes()).toContain('is-visible')

    // Scrolled to the end: nothing left to the right.
    mockNavMetrics(nav.element, 600, 300, 300)
    await nav.trigger('scroll')
    expect(wrapper.find('.app-bar__nav-fade--left').classes()).toContain('is-visible')
    expect(wrapper.find('.app-bar__nav-fade--right').classes()).not.toContain('is-visible')

    // Fits again: affordance off, fades removed entirely.
    mockNavMetrics(nav.element, 300, 300, 0)
    await nav.trigger('scroll')
    expect(nav.classes()).not.toContain('is-scrollable')
    expect(wrapper.find('.app-bar__nav-fade--left').exists()).toBe(false)
    expect(wrapper.find('.app-bar__nav-fade--right').exists()).toBe(false)
  })

  it('keeps every nav tab natively focusable for arrow-scroll reachability', async () => {
    const wrapper = await mountLayout(await createTestRouter())

    const tabs = wrapper.findAll('.app-bar__tab')
    // Dashboard, Events, Reports, Users, Audit + the sign-out button.
    expect(tabs.length).toBe(6)
    expect(
      tabs.every(
        (tab) =>
          tab.element.hasAttribute('href') || tab.element.tagName === 'BUTTON',
      ),
    ).toBe(true)
  })
})
