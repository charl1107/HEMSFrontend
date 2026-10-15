// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportsDashboardView from './ReportsDashboardView.vue'
import { getSummary, type SummaryReport } from '../../../api/reports.api'
import { expectSequentialHeadings } from '../../../test-utils/headings'

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
      total: 3,
      byStatus: { Planning: 1, Ongoing: 1, Completed: 1 },
      byType: { Workshop: 2, Seminar: 1 },
      byMonth: { '2026-06': 2, '2026-07': 1 },
      byCampusScope: { OnCampus: 2, OffCampus: 1 },
    },
    tasks: { total: 5, done: 2, completionRate: 40 },
    ...overrides,
  }
}

async function mountDashboard(): Promise<VueWrapper> {
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'reports-dashboard', component: ReportsDashboardView },
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
    expect(wrapper.find('[data-testid="stat-events"]').text()).toBe('3')
    // completionRate is a percentage to 1 decimal, not a 0–1 fraction.
    expect(wrapper.find('[data-testid="stat-task-rate"]').text()).toBe('40%')
  })

  it('renders status, type and task tables', async () => {
    const wrapper = await mountDashboard()

    expect(wrapper.find('[data-testid="by-status-Planning"]').text()).toContain('1')
    expect(wrapper.find('[data-testid="by-status-Completed"]').text()).toContain('1')
    expect(wrapper.find('[data-testid="event-type-Workshop"]').text()).toContain('2')

    const tasks = wrapper.find('[data-testid="task-completion-row"]')
    expect(tasks.text()).toContain('2')
    expect(tasks.text()).toContain('5')
    expect(tasks.text()).toContain('40%')
  })

  it('shows the error state when the summary fails to load', async () => {
    vi.mocked(getSummary).mockRejectedValue(new Error('boom'))

    const wrapper = await mountDashboard()

    expect(wrapper.find('[data-testid="reports-error"]').text()).toContain('boom')
  })

  it('renders headings in sequential order (axe heading-order)', async () => {
    const wrapper = await mountDashboard()

    expect(wrapper.find('[data-testid="reports-dashboard"]').exists()).toBe(true)
    expectSequentialHeadings(wrapper)
  })
})
