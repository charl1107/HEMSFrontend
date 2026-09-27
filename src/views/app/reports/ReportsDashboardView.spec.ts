// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportsDashboardView from './ReportsDashboardView.vue'
import { getSummary, type SummaryReport } from '../../../api/reports.api'

vi.mock('../../../api/reports.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/reports.api')>()
  return {
    ...actual,
    getSummary: vi.fn(),
  }
})

function makeSummary(overrides: Partial<SummaryReport> = {}): SummaryReport {
  return {
    events: {
      total: 2,
      completed: 1,
      byStatus: [
        { status: 'Completed', count: 1 },
        { status: 'Planning', count: 1 },
      ],
      byType: [{ type: 'Workshop', count: 2 }],
    },
    participants: {
      total: 10,
      byType: [{ type: 'Student', count: 8 }],
    },
    attendance: {
      present: 7,
      absent: 2,
      recorded: 9,
      presentRate: 0.7,
      absentRate: 0.2,
      byEvent: [
        {
          eventId: 'e1',
          title: 'Spring Fair',
          status: 'Completed',
          registered: 10,
          present: 7,
          absent: 2,
          missing: 1,
          presentRate: 0.7,
          absentRate: 0.3,
        },
      ],
    },
    tasks: { total: 4, done: 3, completionRate: 0.75 },
    absenteeDefinition: 'Absent or no row when Completed.',
    ...overrides,
  }
}

async function mountDashboard(): Promise<VueWrapper> {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'reports-dashboard', component: ReportsDashboardView },
      { path: '/reports/events/:id', name: 'event-report', component: { template: '<div />' } },
    ],
  })
  await router.push({ name: 'reports-dashboard' })
  await router.isReady()
  const wrapper = mount(ReportsDashboardView, {
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('ReportsDashboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSummary).mockResolvedValue(makeSummary())
  })

  it('renders overview stats from the summary', async () => {
    const wrapper = await mountDashboard()

    expect(wrapper.find('[data-testid="reports-dashboard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stat-events"]').text()).toBe('2')
    expect(wrapper.find('[data-testid="stat-completed"]').text()).toBe('1')
    expect(wrapper.find('[data-testid="stat-participants"]').text()).toBe('10')
    expect(wrapper.find('[data-testid="stat-present"]').text()).toBe('7')
    expect(wrapper.find('[data-testid="stat-absent"]').text()).toBe('2')
    expect(wrapper.find('[data-testid="stat-present-rate"]').text()).toBe('70.0%')
    expect(wrapper.find('[data-testid="stat-task-rate"]').text()).toBe('75.0%')
  })

  it('renders status, type, participant, and per-event tables', async () => {
    const wrapper = await mountDashboard()

    expect(wrapper.find('[data-testid="by-status-Completed"]').text()).toContain('1')
    expect(wrapper.find('[data-testid="event-type-Workshop"]').text()).toContain('2')
    expect(wrapper.find('[data-testid="participant-type-Student"]').text()).toContain('8')
    expect(wrapper.find('[data-testid="attendance-event-e1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="event-report-link-e1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="absentee-definition"]').text()).toContain(
      'Absent or no row',
    )
  })

  it('shows the error state when the summary fails to load', async () => {
    vi.mocked(getSummary).mockRejectedValue(new Error('boom'))

    const wrapper = await mountDashboard()

    expect(wrapper.find('[data-testid="reports-error"]').text()).toContain('boom')
  })
})
