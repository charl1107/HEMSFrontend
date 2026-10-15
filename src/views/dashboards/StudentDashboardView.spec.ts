// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import StudentDashboardView from './StudentDashboardView.vue'
import { useAuthStore } from '../../stores/auth.store'

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/events', name: 'public-events', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  return mount(StudentDashboardView, { global: { plugins: [router] } })
}

describe('StudentDashboardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.setSession('t', {
      id: '1',
      email: 's@x.com',
      firstName: 'S',
      lastName: 'T',
      isActive: true,
      roles: ['Student'],
      mustChangePassword: false,
    })
  })

  it('shows the browse-events quick action', async () => {
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="student-dashboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="browse-events"]').exists()).toBe(true)
    expect(wrapper.find('.dashboard__eyebrow').text()).toBe('Student')
  })
})
