import type { Project, Task, User } from '@/lib/types'
import {
  canDeleteTaskInProject,
  canEditTaskInProject,
  canManageTaskInProject,
} from '@/lib/utils/permission-utils'

interface UseTaskFormPermissionsParams {
  isEditMode: boolean
  task?: Task
  currentUser: User | null
  selectableProjects: Project[]
  projects: Project[]
  projectId: string
}

/**
 * 任务表单的权限与项目上下文推导，集中在一处便于审计。
 */
export function useTaskFormPermissions({
  isEditMode,
  task,
  currentUser,
  selectableProjects,
  projects,
  projectId,
}: UseTaskFormPermissionsParams) {
  const selectedProject = selectableProjects.find(
    (project) => project.id === projectId
  )

  const selectedProjectPermissionContext = selectedProject
    ? {
        creatorId: selectedProject.creatorId,
        taskPermission: selectedProject.taskPermission,
        memberIds: selectedProject.memberIds,
      }
    : null

  const sourceProject =
    isEditMode && task
      ? projects.find((project) => project.id === task.projectId)
      : selectedProject

  const sourceProjectPermissionContext = sourceProject
    ? {
        creatorId: sourceProject.creatorId,
        taskPermission: sourceProject.taskPermission,
        memberIds: sourceProject.memberIds,
      }
    : null

  const isPersonalProject = !!selectedProject?.name.includes('个人事务')

  const currentTaskAssigneeIds =
    task?.assignees?.map((assignee) => assignee.userId) || []

  const canManageAllTasksInSelectedProject =
    !!currentUser &&
    !!selectedProjectPermissionContext &&
    canManageTaskInProject(
      currentUser.id,
      selectedProjectPermissionContext,
      currentUser.isAdmin
    )

  const isSelectedProjectSelfOnlyMode =
    !!currentUser &&
    !!selectedProjectPermissionContext &&
    selectedProjectPermissionContext.taskPermission === 'CREATOR_ONLY' &&
    !canManageAllTasksInSelectedProject

  const canDeleteTask =
    !isEditMode || !currentUser || !sourceProjectPermissionContext
      ? true
      : canDeleteTaskInProject(
          currentUser.id,
          sourceProjectPermissionContext,
          currentTaskAssigneeIds,
          currentUser.isAdmin
        )

  const canEditTaskContent =
    !isEditMode || !currentUser || !sourceProjectPermissionContext
      ? true
      : canEditTaskInProject(
          currentUser.id,
          sourceProjectPermissionContext,
          currentTaskAssigneeIds,
          undefined,
          currentUser.isAdmin
        )

  const isProjectOnlyEditMode =
    isEditMode && !!task && !canEditTaskContent

  const canStopRecurringTask =
    !!task?.recurringSeriesId &&
    !isProjectOnlyEditMode &&
    canEditTaskContent

  const canEditAssignees =
    !isPersonalProject &&
    !isProjectOnlyEditMode &&
    !isSelectedProjectSelfOnlyMode

  const shouldForceSelfAssignee =
    !!currentUser &&
    (isPersonalProject || isSelectedProjectSelfOnlyMode)

  return {
    selectedProject,
    selectedProjectPermissionContext,
    sourceProject,
    sourceProjectPermissionContext,
    isPersonalProject,
    canManageAllTasksInSelectedProject,
    isSelectedProjectSelfOnlyMode,
    currentTaskAssigneeIds,
    canDeleteTask,
    canEditTaskContent,
    isProjectOnlyEditMode,
    canStopRecurringTask,
    canEditAssignees,
    shouldForceSelfAssignee,
  }
}
