import type { Project, Team, TaskPermission } from "../types"

type ProjectPermissionContext = Pick<
  Project,
  "creatorId" | "taskPermission" | "memberIds"
>

type TeamPermissionContext = Pick<Team, "creatorId" | "taskPermission" | "memberIds">

export function isSelfOnlyAssigneeSet(
  userId: string,
  assigneeIds: string[]
): boolean {
  return assigneeIds.length > 0 && assigneeIds.every((assigneeId) => assigneeId === userId)
}

/**
 * 检查用户是否可以在指定项目中管理任意任务（协同权限）
 * @param userId 当前用户ID
 * @param project 项目信息
 * @param isAdmin 是否为超级管理员
 * @returns 是否有权限
 */
export function canManageTaskInProject(
  userId: string,
  project: ProjectPermissionContext,
  isAdmin: boolean = false
): boolean {
  // 超级管理员拥有所有权限
  if (isAdmin) return true
  
  // 如果不是项目成员，没有权限
  if (!project.memberIds.includes(userId)) return false
  
  // 根据项目协同权限设置判断
  if (project.taskPermission === "ALL_MEMBERS") {
    // 所有成员都可以管理任务（包括修改负责人、归属项目等）
    return true
  } else {
    // 仅创建者可以管理任务
    return userId === project.creatorId
  }
}

/**
 * 检查用户是否可以在指定项目中创建任务给这些负责人
 * "仅创建人"模式下，普通成员只能给自己创建任务
 */
export function canCreateTaskInProject(
  userId: string,
  project: ProjectPermissionContext,
  assigneeIds: string[],
  isAdmin: boolean = false
): boolean {
  if (canManageTaskInProject(userId, project, isAdmin)) return true
  if (!project.memberIds.includes(userId)) return false
  return isSelfOnlyAssigneeSet(userId, assigneeIds)
}

/**
 * 检查用户是否可以编辑当前任务
 * "仅创建人"模式下，普通成员可以编辑指派给自己的任务；
 * 但如果要修改负责人，则新的负责人集合只能是自己。
 */
export function canEditTaskInProject(
  userId: string,
  project: ProjectPermissionContext,
  currentAssigneeIds: string[],
  nextAssigneeIds?: string[],
  isAdmin: boolean = false
): boolean {
  if (canManageTaskInProject(userId, project, isAdmin)) return true
  if (!project.memberIds.includes(userId)) return false
  if (!currentAssigneeIds.includes(userId)) return false
  if (nextAssigneeIds === undefined) return true
  return isSelfOnlyAssigneeSet(userId, nextAssigneeIds)
}

/**
 * 检查用户是否可以删除当前任务
 * "仅创建人"模式下，普通成员仍可删除指派给自己的任务。
 */
export function canDeleteTaskInProject(
  userId: string,
  project: ProjectPermissionContext,
  currentAssigneeIds: string[],
  isAdmin: boolean = false
): boolean {
  if (canManageTaskInProject(userId, project, isAdmin)) return true
  if (!project.memberIds.includes(userId)) return false
  return currentAssigneeIds.includes(userId)
}

/**
 * 检查用户是否可以在指定团队中管理任务（协同权限）
 * 当协同权限设为"所有成员"时，成员可以修改任务的所有字段，包括负责人、归属项目等
 * @param userId 当前用户ID
 * @param team 团队信息
 * @param isAdmin 是否为超级管理员
 * @returns 是否有权限
 */
export function canManageTaskInTeam(
  userId: string,
  team: TeamPermissionContext,
  isAdmin: boolean = false
): boolean {
  // 超级管理员拥有所有权限
  if (isAdmin) return true
  
  // 如果不是团队成员，没有权限
  if (!team.memberIds.includes(userId)) return false
  
  // 根据团队协同权限设置判断
  if (team.taskPermission === "ALL_MEMBERS") {
    // 所有成员都可以管理任务（包括修改负责人、归属项目等）
    return true
  } else {
    // 仅创建者可以管理任务
    return userId === team.creatorId
  }
}

/**
 * 获取权限不足的错误消息
 * @param permission 协同权限设置
 * @returns 错误消息
 */
export function getPermissionDeniedMessage(permission: TaskPermission): string {
  if (permission === "CREATOR_ONLY") {
    return "当前项目/团队的协同权限为仅创建人，普通成员只能管理指派给自己的任务"
  }
  return "您没有权限执行此操作"
}
