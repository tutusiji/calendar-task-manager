import type { Project, Task, Team } from '@/lib/types'

export interface TaskNavigationFilterContext {
  navigationMode: 'my-days' | 'team' | 'project'
  currentUserId?: string | null
  selectedTeamId?: string | null
  selectedProjectId?: string | null
  selectedProjectIds: string[]
  getTeamById: (id: string) => Team | undefined
  getProjectById: (id: string) => Project | undefined
  /**
   * 团队视图是否包含个人事务项目中的任务。
   * 历史实现中月/周/清单包含，统计视图排除；保留开关避免一次性改变现有行为。
   */
  teamModeIncludesPersonalProjects?: boolean
}

/**
 * 按导航模式过滤任务：My Days / 团队 / 项目 / 项目多选。
 */
export function filterTasksByNavigationMode(
  tasks: Task[],
  context: TaskNavigationFilterContext
): Task[] {
  const {
    navigationMode,
    currentUserId,
    selectedTeamId,
    selectedProjectId,
    selectedProjectIds,
    getTeamById,
    getProjectById,
    teamModeIncludesPersonalProjects = true,
  } = context

  if (navigationMode === 'my-days') {
    if (!currentUserId || selectedProjectIds.length === 0) {
      return []
    }

    return tasks.filter(
      (task) =>
        selectedProjectIds.includes(task.projectId) &&
        (task.assignees?.some(
          (assignee) => assignee.userId === currentUserId
        ) ||
          task.creatorId === currentUserId)
    )
  }

  if (navigationMode === 'team' && selectedTeamId) {
    const team = getTeamById(selectedTeamId)
    if (!team) return []

    return tasks.filter((task) => {
      if (
        !teamModeIncludesPersonalProjects &&
        getProjectById(task.projectId)?.type === 'PERSONAL'
      ) {
        return false
      }

      return (
        task.assignees?.some((assignee) =>
          team.memberIds.includes(assignee.userId)
        ) || team.memberIds.includes(task.creatorId)
      )
    })
  }

  if (navigationMode === 'project' && selectedProjectId) {
    const project = getProjectById(selectedProjectId)
    if (!project) return []

    return tasks.filter(
      (task) =>
        task.projectId === selectedProjectId &&
        (task.assignees?.some((assignee) =>
          project.memberIds.includes(assignee.userId)
        ) ||
          project.memberIds.includes(task.creatorId))
    )
  }

  if (selectedProjectIds.length === 0) {
    return []
  }

  return tasks.filter((task) => selectedProjectIds.includes(task.projectId))
}

function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toEndOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  )
}

/**
 * 判断任务与日期范围是否重叠（与现有月/周/清单语义一致）。
 */
export function taskOverlapsRange(
  task: Task,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  const taskStart = toStartOfDay(new Date(task.startDate))
  const taskEnd = toEndOfDay(new Date(task.endDate))
  const start = toStartOfDay(rangeStart)
  const end = toEndOfDay(rangeEnd)

  return taskStart <= end && taskEnd >= start
}

export function filterTasksByDateRange(
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date
): Task[] {
  return tasks.filter((task) => taskOverlapsRange(task, rangeStart, rangeEnd))
}
