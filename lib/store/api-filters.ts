import type { NavigationMode, User } from '@/lib/types'

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
