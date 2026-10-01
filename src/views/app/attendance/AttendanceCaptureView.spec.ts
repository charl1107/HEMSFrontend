// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AttendanceCaptureView from './AttendanceCaptureView.vue'
import { listAttendance, timeIn, type AttendanceRecord } from '../../../api/attendance.api'
import { getEvent, type EventRecord } from '../../../api/events.api'
import { listParticipants, type ParticipantRecord } from '../../../api/participants.api'
import { countPending, listRejectedRecords } from '../../../services/attendance-queue'
import { expectSequentialHeadings } from '../../../test-utils/headings'

vi.mock('../../../api/attendance.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/attendance.api')>()
  return {
    ...actual,
    listAttendance: vi.fn(),
    timeIn: vi.fn(),
    timeOut: vi.fn(),
  }
})

vi.mock('../../../api/events.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/events.api')>()
  return {
    ...actual,
    getEvent: vi.fn(),
  }
})

vi.mock('../../../api/participants.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/participants.api')>()
  return {
    ...actual,
    listParticipants: vi.fn(),
  }
})

// The view reads the IndexedDB-backed offline queue on mount; fake it so the
// spec never touches a real database (or the network).
vi.mock('../../../services/attendance-queue', () => ({
  countPending: vi.fn(),
  enqueue: vi.fn(),
  listPendingRecords: vi.fn(),
  listRejectedRecords: vi.fn(),
  loadRosterSnapshot: vi.fn(),
  saveRosterSnapshot: vi.fn(),
}))

const event: EventRecord = {
  id: 'e1',
  title: 'Spring Fair',
  description: null,
  eventDate: '2026-05-01T00:00:00.000Z',
  venue: 'Main Hall',
  status: 'Approved',
  coverImageUrl: null,
  eventTypeId: null,
  eventType: null,
  createdById: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function makeParticipant(id: string, firstName: string): ParticipantRecord {
  return {
    id,
    eventId: 'e1',
    userId: id,
    externalName: null,
    participantType: 'Student',
    registrationStatus: 'Approved',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    user: { id, firstName, lastName: 'Dent', email: `${id}@x.com` },
  }
}

const p1 = makeParticipant('p1', 'Ana')
const p2 = makeParticipant('p2', 'Ben')

function makeTimeInRecord(): AttendanceRecord {
  const now = '2026-05-01T08:00:00.000Z'
  return {
    id: 'a2',
    eventId: 'e1',
    participantId: 'p2',
    status: 'Present',
    timeIn: now,
    timeOut: null,
    clientRecordId: null,
    syncedAt: null,
    createdAt: now,
    updatedAt: now,
    participant: {
      id: 'p2',
      externalName: null,
      participantType: 'Student',
      user: { id: 'p2', firstName: 'Ben', lastName: 'Dent', email: 'p2@x.com' },
    },
  }
}

/** A gate refusal: HTTP 409 with an axios-shaped error. */
function gateRefusal(): Error {
  return Object.assign(new Error('Request failed with status code 409'), {
    isAxiosError: true,
    response: { status: 409, data: { message: 'Already timed in at the gate' } },
  })
}

async function createViewRouter(): Promise<Router> {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/manage/events/:id/attendance',
        name: 'attendance-capture',
        component: AttendanceCaptureView,
      },
      {
        path: '/manage/events/:id',
        name: 'event-detail',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push('/manage/events/e1/attendance')
  await router.isReady()
  return router
}

async function mountView(): Promise<VueWrapper> {
  const router = await createViewRouter()
  const wrapper = mount(AttendanceCaptureView, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('AttendanceCaptureView gate refusal (U10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    vi.mocked(getEvent).mockResolvedValue(event)
    vi.mocked(listParticipants).mockResolvedValue([p1, p2])
    vi.mocked(listAttendance).mockResolvedValue([])
    vi.mocked(countPending).mockResolvedValue(0)
    vi.mocked(listRejectedRecords).mockResolvedValue([])
  })

  it("disables a participant's Time in after a 409 gate refusal and re-enables it once the local error clears", async () => {
    vi.mocked(timeIn)
      .mockRejectedValueOnce(gateRefusal())
      .mockResolvedValueOnce(makeTimeInRecord())

    const wrapper = await mountView()
    const button = () => wrapper.find('[data-testid="time-in-p1"]')

    expect(button().attributes('disabled')).toBeUndefined()

    await button().trigger('click')
    await flushPromises()

    // Gate refused the time-in (HTTP 409): the button is dead while refused.
    expect(button().attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="capture-error"]').text()).toContain(
      'Already timed in at the gate',
    )

    // The next action clears the local error → the button comes back.
    await wrapper.find('[data-testid="time-in-p2"]').trigger('click')
    await flushPromises()
    expect(button().attributes('disabled')).toBeUndefined()
  })

  it('does not flash an empty role="alert" before the first load settles', async () => {
    const router = await createViewRouter()
    const wrapper = mount(AttendanceCaptureView, { global: { plugins: [router] } })
    // Synchronous first paint: onMounted(load) has started but nothing has
    // flushed yet — the pre-load branch must not emit an empty alert.
    expect(wrapper.find('[data-testid="capture-error"]').exists()).toBe(false)
    wrapper.unmount()
    await flushPromises()
  })
})

describe('AttendanceCaptureView heading order (axe)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    vi.mocked(getEvent).mockResolvedValue(event)
    vi.mocked(listParticipants).mockResolvedValue([p1, p2])
    vi.mocked(listAttendance).mockResolvedValue([])
    vi.mocked(countPending).mockResolvedValue(0)
    vi.mocked(listRejectedRecords).mockResolvedValue([])
  })

  it('renders headings in sequential order with the roster on screen (axe heading-order)', async () => {
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="roster-list"]').exists()).toBe(true)
    expectSequentialHeadings(wrapper)
  })
})
