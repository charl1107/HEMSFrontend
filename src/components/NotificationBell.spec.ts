// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { reactive } from 'vue'
import NotificationBell from './NotificationBell.vue'
import {
  listNotifications,
  markNotificationRead,
  type NotificationRecord,
} from '../api/notifications.api'

vi.mock('../api/notifications.api', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../api/notifications.api')>()
  return {
    ...actual,
    listNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
  }
})

const route = reactive({ fullPath: '/dashboard' })

vi.mock('vue-router', () => ({
  useRoute: () => route,
}))

function makeNotification(
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord {
  return {
    id: 'n1',
    userId: 'u1',
    eventId: 'e1',
    type: 'EventApproved',
    message: 'Event approved',
    isRead: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

let wrapper: VueWrapper | null = null

function mountBell(): VueWrapper {
  wrapper = mount(NotificationBell)
  return wrapper
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.fullPath = '/dashboard'
    vi.mocked(listNotifications).mockResolvedValue([])
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('fetches notifications on mount and shows the unread badge', async () => {
    vi.mocked(listNotifications).mockResolvedValue([
      makeNotification({ id: 'n1', isRead: false }),
      makeNotification({ id: 'n2', isRead: true }),
    ])
    const wrapper = mountBell()
    await flushPromises()

    expect(listNotifications).toHaveBeenCalledTimes(1)
    const badge = wrapper.get('[data-testid="notification-badge"]')
    expect(badge.text()).toBe('1')
  })

  it('opens the dropdown and lists notifications', async () => {
    vi.mocked(listNotifications).mockResolvedValue([
      makeNotification({ message: 'Task assigned to you' }),
    ])
    const wrapper = mountBell()
    await flushPromises()

    await wrapper.get('[data-testid="notification-bell"]').trigger('click')

    const panel = wrapper.get('[data-testid="notification-panel"]')
    expect(panel.text()).toContain('Task assigned to you')
  })

  it('marks a notification as read and updates the badge', async () => {
    const unread = makeNotification({ id: 'n1', isRead: false })
    const read = { ...unread, isRead: true }
    vi.mocked(listNotifications).mockResolvedValue([unread])
    vi.mocked(markNotificationRead).mockResolvedValue(read)

    const wrapper = mountBell()
    await flushPromises()

    expect(wrapper.get('[data-testid="notification-badge"]').text()).toBe('1')

    await wrapper.get('[data-testid="notification-bell"]').trigger('click')
    await wrapper.get('[data-testid="notification-item"]').trigger('click')
    await flushPromises()

    expect(markNotificationRead).toHaveBeenCalledWith('n1')
    expect(
      wrapper.find('[data-testid="notification-badge"]').exists(),
    ).toBe(false)
    expect(
      wrapper.get('[data-testid="notification-item"]').attributes('data-read'),
    ).toBe('true')
  })

  it('does not call mark-as-read for already-read notifications', async () => {
    vi.mocked(listNotifications).mockResolvedValue([
      makeNotification({ id: 'n1', isRead: true }),
    ])
    const wrapper = mountBell()
    await flushPromises()

    await wrapper.get('[data-testid="notification-bell"]').trigger('click')
    await wrapper.get('[data-testid="notification-item"]').trigger('click')
    await flushPromises()

    expect(markNotificationRead).not.toHaveBeenCalled()
  })

  it('refreshes when the route changes', async () => {
    mountBell()
    await flushPromises()
    expect(listNotifications).toHaveBeenCalledTimes(1)

    route.fullPath = '/events'
    await flushPromises()
    expect(listNotifications).toHaveBeenCalledTimes(2)
  })

  it('shows an empty state when there are no notifications', async () => {
    const wrapper = mountBell()
    await flushPromises()

    await wrapper.get('[data-testid="notification-bell"]').trigger('click')
    expect(wrapper.get('[data-testid="notification-empty"]').text()).toContain(
      'No notifications',
    )
  })
})
