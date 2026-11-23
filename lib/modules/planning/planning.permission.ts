import type { PlanningScopeType } from "@/lib/planning"
import { findPlanningProjectMember, findPlanningTeamMember } from "./planning.repository"

type PlanningScopeAccess =
  | { allowed: true; scopeData: { ownerUserId: string; teamId?: null; projectId?: null } }
  | { allowed: true; scopeData: { teamId: string; ownerUserId?: null; projectId?: null } }
  | { allowed: true; scopeData: { projectId: string; ownerUserId?: null; teamId?: null } }
  | { allowed: false; message: string }

export async function ensurePlanningScopeAccess(
  userId: string,
  scopeType: PlanningScopeType,
  scopeId: string
): Promise<PlanningScopeAccess> {
  if (!scopeId) {
    return { allowed: false, message: "缺少计划作用域 ID" }
  }

  if (scopeType === "PERSONAL") {
    if (scopeId !== userId) {
      return { allowed: false, message: "无权访问其他用户的个人计划" }
    }

    return { allowed: true, scopeData: { ownerUserId: userId } }
  }

  if (scopeType === "TEAM") {
    const isMember = await findPlanningTeamMember(userId, scopeId)

    if (!isMember) {
      return { allowed: false, message: "无权访问该团队的计划板" }
    }

    return { allowed: true, scopeData: { teamId: scopeId } }
  }

  const isMember = await findPlanningProjectMember(userId, scopeId)

  if (!isMember) {
    return { allowed: false, message: "无权访问该项目的计划板" }
  }

  return { allowed: true, scopeData: { projectId: scopeId } }
}

export async function canUserAccessPlanningBoard(
  userId: string,
  board: {
    scopeType: PlanningScopeType
    ownerUserId: string | null
    teamId: string | null
    projectId: string | null
  }
) {
  if (board.scopeType === "PERSONAL") {
    return board.ownerUserId === userId
  }

  if (board.scopeType === "TEAM" && board.teamId) {
    const isMember = await findPlanningTeamMember(userId, board.teamId)

    return !!isMember
  }

  if (board.scopeType === "PROJECT" && board.projectId) {
    const isMember = await findPlanningProjectMember(userId, board.projectId)

    return !!isMember
  }

  return false
}
