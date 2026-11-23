import { createStore } from 'zustand/vanilla'
import { describe, expect, it, vi } from 'vitest'

import { taskAPI } from '@/lib/api-client'
import { createTaskActions } from '@/lib/store/actions/task-actions'
import { getTaskQueryRanges, getTaskViewDateRange } from '@/lib/store/api-filters'
import type { CalendarStore } from '@/lib/store/calendar-store'
import type { Task } from '@/lib/types'

vi.mock('@/lib/api-client', () => ({
  taskAPI: { getWindow: vi.fn(), prepareRecurringThrough: vi.fn() },
  handleAPIError: (error: Error) => error.message,
}))

vi.mock('@/lib/toast', () => ({ showToast: { error: vi.fn() } }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => { resolve = finish })
  return { promise, resolve }
}

function createTaskStore(date: Date) {
  const store = createStore<CalendarStore>()((set, get, api) => createTaskActions(set, get, api) as CalendarStore)
  store.setState({
    currentDate: date,
    miniCalendarDate: date,
    viewMode: 'week',
    mainViewMode: 'calendar',
    hideWeekends: false,
    currentUser: {
      id: 'user',
      username: 'user',
      name: 'User',
      avatar: '',
      email: 'user@example.test',
      currentOrganizationId: 'org',
    },
    navigationMode: 'team',
    selectedTeamId: 'first',
    tasks: [],
  })
  return store
}

describe('task queries', () => {
  it('keeps list and statistics ranges and covers the adjacent dates shown in the calendar', () => {
    const currentDate = new Date(2026, 4, 1, 23)
    const week = getTaskViewDateRange(currentDate, 'week', 'stats', true)
    const grid = getTaskViewDateRange(currentDate, 'month', 'calendar')
    const month = getTaskViewDateRange(currentDate, 'month', 'list')

    expect(week.start).toEqual(new Date(2026, 3, 27))
    expect(week.end.getDay()).toBe(0)
    expect(grid.start).toEqual(week.start)
    expect(grid.end).toEqual(new Date(2026, 5, 7, 23, 59, 59, 999))
    expect(month.start).toEqual(new Date(2026, 4, 1))

    const ranges = getTaskQueryRanges({
      currentDate,
      miniCalendarDate: new Date(2026, 0, 1),
      viewMode: 'week',
      mainViewMode: 'calendar',
      hideWeekends: false,
    })
    expect(ranges).toHaveLength(2)
    expect(ranges[0]).toEqual(week)
    expect(ranges[1].start).toEqual(new Date(2026, 0, 1))
  })

  it('ignores a late team response even when the transport resolves after cancellation', async () => {
    const currentDate = new Date(2026, 4, 1)
    const older = deferred<Awaited<ReturnType<typeof taskAPI.getWindow>>>()
    const newer = deferred<Awaited<ReturnType<typeof taskAPI.getWindow>>>()
    const getWindow = vi.mocked(taskAPI.getWindow)
    getWindow.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    const store = createTaskStore(currentDate)

    const firstRequest = store.getState().fetchTasks()
    store.setState({ selectedTeamId: 'second' })
    const secondRequest = store.getState().fetchTasks()
    expect(getWindow.mock.calls[0][1]?.aborted).toBe(true)

    newer.resolve({ tasks: [{ id: 'new', startDate: currentDate, endDate: currentDate } as Task], recurringPending: false })
    await secondRequest
    older.resolve({ tasks: [{ id: 'old', startDate: currentDate, endDate: currentDate } as Task], recurringPending: false })
    await firstRequest

    expect(store.getState().isLoadingTasks).toBe(false)
    expect(store.getState().tasks.map(({ id }) => id)).toEqual(['new'])
  })

  it('re-reads the window after the server reports missing recurring instances', async () => {
    const date = new Date(2030, 4, 1)
    const store = createTaskStore(date)
    const getWindow = vi.mocked(taskAPI.getWindow)
    getWindow
      .mockResolvedValueOnce({ tasks: [], recurringPending: true })
      .mockResolvedValueOnce({ tasks: [{ id: 'future', startDate: date, endDate: date } as Task], recurringPending: false })

    await store.getState().fetchTasks()

    expect(taskAPI.prepareRecurringThrough).toHaveBeenCalledWith(expect.any(Date), 'org', expect.any(AbortSignal))
    expect(getWindow).toHaveBeenCalledTimes(2)
    expect(store.getState().tasks.map(({ id }) => id)).toEqual(['future'])
  })
})
