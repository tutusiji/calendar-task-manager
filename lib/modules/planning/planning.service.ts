import type { PlanningScopeType } from "@/lib/planning"
import { canUserAccessPlanningBoard, ensurePlanningScopeAccess } from "./planning.permission"
import { findBoardsInScope, findPlanningBoardDetail, findPlanningBoardScope, insertPlanningBoard } from "./planning.repository"

export async function listPlanningBoards(
  userId: string,
  scopeType: PlanningScopeType,
  scopeId: string,
  summary: boolean,
) {
  const access = await ensurePlanningScopeAccess(userId, scopeType, scopeId)
  if (!access.allowed) return { kind: "forbidden" as const, message: access.message }
  return { kind: "ok" as const, boards: await findBoardsInScope(scopeType, scopeId, summary) }
}

export async function loadPlanningBoard(userId: string, id: string) {
  const scope = await findPlanningBoardScope(id)
  if (!scope) return { kind: "not-found" as const }
  if (!(await canUserAccessPlanningBoard(userId, scope))) return { kind: "forbidden" as const }

  const board = await findPlanningBoardDetail(id)
  return board ? { kind: "ok" as const, board } : { kind: "not-found" as const }
}

export async function createPlanningBoard(
  userId: string,
  scopeType: PlanningScopeType,
  scopeId: string,
  fields: { name: string; description: string | null; color: string },
) {
  const access = await ensurePlanningScopeAccess(userId, scopeType, scopeId)
  if (!access.allowed) return { kind: "forbidden" as const, message: access.message }

  const board = await insertPlanningBoard({ ...fields, ...access.scopeData, scopeType, creatorId: userId })
  return { kind: "ok" as const, board }
}
