import type { Project, Team, User, TaskPermission } from "../types"

/**
 * 检查用户是否可以在指定项目中管理任务（协同权限）
 * 当协同权限设为"所有成员"时，成员可以修改任务的所有字段，包括负责人、归属项目等
 * @param userId 当前用户ID
 * @param project 项目信息
 * @param isAdmin 是否为超级管理员
 * @returns 是否有权限
 */
export function canManageTaskInProject(
  userId: string,
  project: Project,
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
 * 检查用户是否可以在指定团队中管理任务（协同权限）
 * 当协同权限设为"所有成员"时，成员可以修改任务的所有字段，包括负责人、归属项目等
 * @param userId 当前用户ID
 * @param team 团队信息
 * @param isAdmin 是否为超级管理员
 * @returns 是否有权限
 */
export function canManageTaskInTeam(
  userId: string,
  team: Team,
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
    return "当前项目/团队的协同权限仅允许创建者管理任务"
  }
  return "您没有权限执行此操作"
}
