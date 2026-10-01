// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import StudentDashboardView from './StudentDashboardView.vue'
import { useAuthStore } from '../../stores/auth.store'
import { listMyAttendance } from '../../api/attendance.api'

// The view loads attendance in onMounted(); without this mock the test would
// fire a real GET /attendance/me at VITE_API_BASE_URL (localhost:3000) and fail
// asynchronously with ECONNREFUSED whenever no API server is running.
vi.mock('../../api/attendance.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/attendance.api')>()
  return {
    ...actual,
    listMyAttendance: vi.fn(),
  }
})

const attendanceRow = {
  event: {
    id: 'e1',
    title: 'Founders Day Cup',
    eventDate: '2026-09-01',
    venue: 'Grand Hall',
    status: 'Planning',
  },
  attendance: {
    id: 'a1',
    eventId: 'e1',
    participantId: 'p1',
    status: 'Present',
    timeIn: '2026-09-01T08:00:00.000Z',
    timeOut: '2026-09-01T17:00:00.000Z',
    clientRecordId: null,
    syncedAt: '2026-09-01T17:00:05.000Z',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T17:00:00.000Z',
    participant: {
      id: 'p1',
      externalName: null,
      participantType: 'Student',
      user: { id: '1', firstName: 'S', lastName: 'T', email: 's@x.com' },
    },
  },
}

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/events', name: 'public-events', component: { template: '<div />' } },
      { path: '/my-attendance', name: 'my-attendance', component: { template: '<div />' } },
    ],
  })
  await router.push('/')
  await router.isReady()
  return mount(StudentDashboardView, { global: { plugins: [router] } })
}

describe('StudentDashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    vi.mocked(listMyAttendance).mockResolvedValue([])
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="student-dashboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="browse-events"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="my-attendance-link"]').exists()).toBe(true)
    expect(wrapper.find('.dashboard__eyebrow').text()).toBe('Student')
  })

  it('requests the signed-in student attendance exactly once on mount', async () => {
    vi.mocked(listMyAttendance).mockResolvedValue([])
    await mountView()
    await flushPromises()

    expect(listMyAttendance).toHaveBeenCalledTimes(1)
  })

  it('renders the attendance rows returned by the API', async () => {
    vi.mocked(listMyAttendance).mockResolvedValue([attendanceRow as never])
    const wrapper = await mountView()
    await flushPromises()

    // Upcoming events card + summary card both come from the fetched rows.
    expect(wrapper.text()).toContain('Founders Day Cup')
    expect(wrapper.text()).toContain('Grand Hall')
    expect(wrapper.text()).toContain('Attended')
    expect(wrapper.text()).toContain('100%')
    expect(wrapper.text()).toContain('Attendance Rate')
  })

  it('shows an error message when attendance fails to load', async () => {
    vi.mocked(listMyAttendance).mockRejectedValue(new Error('Network Error'))
    const wrapper = await mountView()
    await flushPromises()

    const error = wrapper.find('.dashboard__error')
    expect(error.exists()).toBe(true)
    expect(error.attributes('role')).toBe('alert')
    expect(error.text()).toContain('Network Error')
    expect(wrapper.text()).not.toContain('Founders Day Cup')
  })
})
