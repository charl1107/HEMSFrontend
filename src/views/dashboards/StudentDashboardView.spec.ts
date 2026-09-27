// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import StudentDashboardView from './StudentDashboardView.vue'
import { useAuthStore } from '../../stores/auth.store'

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

  it('shows browse and attendance links with testids', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/events', name: 'public-events', component: { template: '<div />' } },
        { path: '/my-attendance', name: 'my-attendance', component: { template: '<div />' } },
      ],
    })
    const wrapper = mount(StudentDashboardView, { global: { plugins: [router] } })
    expect(wrapper.find('[data-testid="student-dashboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="browse-events"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="my-attendance-link"]').exists()).toBe(true)
    expect(wrapper.find('.dashboard__eyebrow').exists()).toBe(true)
  })
})
