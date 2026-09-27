// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MyAttendanceView from './MyAttendanceView.vue'
import { useAuthStore } from '../../../stores/auth.store'
import {
  listAttendance,
  listMyAttendance,
  type MyAttendanceRow,
} from '../../../api/attendance.api'
import { listEvents } from '../../../api/events.api'

vi.mock('../../../api/attendance.api', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../../api/attendance.api')
  >()
  return {
    ...actual,
    listMyAttendance: vi.fn(),
    listAttendance: vi.fn(),
  }
})

vi.mock('../../../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/events.api')>()
  return {
    ...actual,
    listEvents: vi.fn(),
  }
})

function makeRow(overrides: Partial<MyAttendanceRow> = {}): MyAttendanceRow {
  return {
    event: {
      id: 'e1',
      title: 'Spring Fair',
      description: null,
      eventDate: '2026-05-01T00:00:00.000Z',
      venue: 'Main Hall',
      status: 'Completed',
      coverImageUrl: null,
      eventTypeId: null,
      eventType: { id: 't1', name: 'Fair' },
      createdById: 'u1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    attendance: {
      id: 'a1',
      eventId: 'e1',
      participantId: 'p1',
      status: 'Present',
      timeIn: '2026-05-01T08:00:00.000Z',
      timeOut: '2026-05-01T10:00:00.000Z',
      clientRecordId: null,
      syncedAt: null,
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
      participant: {
        id: 'p1',
        externalName: null,
        participantType: 'Student',
        user: {
          id: 'u1',
          firstName: 'Stu',
          lastName: 'Dent',
          email: 'stu@hems.local',
        },
      },
    },
    ...overrides,
  }
}

function setSession(): void {
  const auth = useAuthStore()
  auth.setSession('token', {
    id: 'u1',
    email: 'stu@hems.local',
    firstName: 'Stu',
    lastName: 'Dent',
    isActive: true,
    roles: ['Student'],
    mustChangePassword: false,
  })
}

async function createTestRouter(): Promise<Router> {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/me/attendance',
        name: 'my-attendance',
        component: MyAttendanceView,
      },
      {
        path: '/',
        name: 'student-dashboard',
        component: { template: '<div />' },
      },
    ],
  })
}

async function mountView(router: Router): Promise<VueWrapper> {
  await router.push({ name: 'my-attendance' })
  await router.isReady()
  const wrapper = mount(MyAttendanceView, {
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('MyAttendanceView', () => {
  let router: Router

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    setSession()
    router = await createTestRouter()
    vi.mocked(listAttendance).mockResolvedValue([])
    vi.mocked(listEvents).mockResolvedValue({ items: [], total: 0 })
    vi.mocked(listMyAttendance).mockResolvedValue([makeRow()])
  })

  it('renders attendance history from the single me endpoint', async () => {
    const wrapper = await mountView(router)

    expect(listMyAttendance).toHaveBeenCalledTimes(1)
    expect(listEvents).not.toHaveBeenCalled()
    expect(listAttendance).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="my-attendance-list"]').exists()).toBe(
      true,
    )
    expect(wrapper.text()).toContain('Spring Fair')
    expect(
      wrapper.find('[data-testid="my-attendance-row-a1"]').exists(),
    ).toBe(true)
  })

  it('shows empty state when the user attended nothing', async () => {
    vi.mocked(listMyAttendance).mockResolvedValue([])
    const wrapper = await mountView(router)

    expect(wrapper.find('[data-testid="my-attendance-empty"]').exists()).toBe(
      true,
    )
    expect(
      wrapper.find('[data-testid="my-attendance-list"]').exists(),
    ).toBe(false)
  })

  it('surfaces a load failure', async () => {
    vi.mocked(listMyAttendance).mockRejectedValue(new Error('boom'))
    const wrapper = await mountView(router)

    expect(wrapper.find('[data-testid="my-attendance-error"]').exists()).toBe(
      true,
    )
    expect(
      wrapper.find('[data-testid="my-attendance-list"]').exists(),
    ).toBe(false)
  })
})
