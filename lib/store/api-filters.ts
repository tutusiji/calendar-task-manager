import { addDays, endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import type { MainViewMode, NavigationMode, User, ViewMode } from '@/lib/types'
import { getMonthDays } from '@/lib/utils/date-utils'

export interface ApiTaskFilters {
  userId?: string
  projectId?: string
  teamId?: string
}

/**
 * 根据当前导航状态推导任务列表 API 过滤条件。
 */
export function getFiltersForCurrentNavigation(state: {
  navigationMode: NavigationMode
  selectedTeamId: string | null
  selectedProjectId: string | null
  currentUser: User | null
}): ApiTaskFilters {
  if (state.navigationMode === 'team' && state.selectedTeamId) {
    return { teamId: state.selectedTeamId }
  }

  if (state.navigationMode === 'project' && state.selectedProjectId) {
    return { projectId: state.selectedProjectId }
  }

  if (state.currentUser) {
    return { userId: state.currentUser.id }
  }

  return {}
}

export function getTaskViewDateRange(
  date: Date,
  viewMode: ViewMode,
  mainViewMode: MainViewMode = 'list',
  hideWeekends = false,
) {
  if (viewMode !== 'month') {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    return {
      start,
      end: mainViewMode === 'calendar' && hideWeekends
        ? endOfDay(addDays(start, 4))
        : endOfWeek(date, { weekStartsOn: 1 }),
    }
  }

  if (mainViewMode === 'calendar') {
    const days = getMonthDays(date.getFullYear(), date.getMonth(), hideWeekends)
    return { start: startOfDay(days[0]), end: endOfDay(days[days.length - 1]) }
  }

  return { start: startOfMonth(date), end: endOfMonth(date) }
}

export function getTaskQueryRanges(state: {
  currentDate: Date
  miniCalendarDate: Date
  viewMode: ViewMode
  mainViewMode: MainViewMode
  hideWeekends: boolean
}) {
  const mini = {
    start: startOfMonth(state.miniCalendarDate),
    end: endOfMonth(state.miniCalendarDate),
  }
  if (state.mainViewMode === 'plan') return [mini]

  const main = getTaskViewDateRange(
    state.currentDate, state.viewMode, state.mainViewMode, state.hideWeekends,
  )
  if (main.end.getTime() + 1 < mini.start.getTime() ||
      mini.end.getTime() + 1 < main.start.getTime()) {
    return [main, mini]
  }
  return [{
    start: main.start < mini.start ? main.start : mini.start,
    end: main.end > mini.end ? main.end : mini.end,
  }]
}
