import {
  canCreateTaskInProject,
  canDeleteTaskInProject,
  canEditTaskInProject,
  getPermissionDeniedMessage,
} from '@/lib/utils/permission-utils'

import * as taskRepository from './task.repository'
import { TaskServiceError } from './task.types'

export interface ProjectPermissionContext {
  creatorId: string
  taskPermission: 'ALL_MEMBERS' | 'CREATOR_ONLY'
  memberIds: string[]
}

export async function assertOrganizationAccess(
  userId: string,
  organizationId: string
) {
  const membership = await taskRepository.findOrganizationMembership(
    userId,
    organizationId
  )

  if (!membership) {
    throw new TaskServiceError(403, '无权访问该组织的数据')
  }

  return membership
}

export async function assertAssigneesInOrganization(
  assigneeIds: string[],
  organizationId: string
) {
  if (assigneeIds.length === 0) return

  const members = await taskRepository.findOrganizationMembersByIds(
    organizationId,
    assigneeIds
  )

  if (members.length !== assigneeIds.length) {
    throw new TaskServiceError(400, '负责人必须属于项目所属组织')
  }
}

export async function assertTeamInOrganization(
  teamId: string | null | undefined,
  organizationId: string
) {
  if (!teamId) return

  const team = await taskRepository.findTeamInOrganization(
    teamId,
    organizationId
  )

  if (!team) {
    throw new TaskServiceError(400, '团队不存在或不属于项目所属组织')
  }
}

export function assertCanCreateTask(
  userId: string,
  project: ProjectPermissionContext,
  assigneeIds: string[],
  isAdmin: boolean
) {
  if (!canCreateTaskInProject(userId, project, assigneeIds, isAdmin)) {
    throw new TaskServiceError(
      403,
      getPermissionDeniedMessage(project.taskPermission)
    )
  }
}

export function assertCanEditTask(
  userId: string,
  project: ProjectPermissionContext,
  currentAssigneeIds: string[],
  nextAssigneeIds: string[] | undefined,
  isAdmin: boolean
) {
  if (
    !canEditTaskInProject(
      userId,
      project,
      currentAssigneeIds,
      nextAssigneeIds,
      isAdmin
    )
  ) {
    throw new TaskServiceError(
      403,
      getPermissionDeniedMessage(project.taskPermission)
    )
  }
}

export function assertCanDeleteTask(
  userId: string,
  project: ProjectPermissionContext,
  currentAssigneeIds: string[],
  isAdmin: boolean
) {
  if (
    !canDeleteTaskInProject(
      userId,
      project,
      currentAssigneeIds,
      isAdmin
    )
  ) {
    throw new TaskServiceError(
      403,
      getPermissionDeniedMessage(project.taskPermission)
    )
  }
}
