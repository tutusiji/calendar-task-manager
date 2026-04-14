import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  DEFAULT_PLANNING_BOARD_COLOR,
  DEFAULT_PLANNING_BUCKET_WIDTH,
  DEFAULT_PLANNING_CARD_COLOR,
  MAX_PLANNING_BUCKET_WIDTH,
  MIN_PLANNING_BUCKET_WIDTH,
  type PlanningScopeType,
} from "@/lib/planning"
import { isValidHexColor, sanitizeString } from "@/lib/validation"

export const planningUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  avatar: true,
} satisfies Prisma.UserSelect

export const planningBoardInclude = {
  buckets: {
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      cards: {
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
        include: {
          items: {
            orderBy: [
              { sortOrder: "asc" },
              { createdAt: "asc" },
            ],
          },
          assignees: {
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: planningUserSelect,
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.PlanningBoardInclude

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
    const isMember = await prisma.teamMember.findFirst({
      where: {
        teamId: scopeId,
        userId,
      },
      select: { id: true },
    })

    if (!isMember) {
      return { allowed: false, message: "无权访问该团队的计划板" }
    }

    return { allowed: true, scopeData: { teamId: scopeId } }
  }

  const isMember = await prisma.projectMember.findFirst({
    where: {
      projectId: scopeId,
      userId,
    },
    select: { id: true },
  })

  if (!isMember) {
    return { allowed: false, message: "无权访问该项目的计划板" }
  }

  return { allowed: true, scopeData: { projectId: scopeId } }
}

export function buildPlanningScopeWhere(
  scopeType: PlanningScopeType,
  scopeId: string
) {
  if (scopeType === "PERSONAL") {
    return {
      scopeType,
      ownerUserId: scopeId,
    }
  }

  if (scopeType === "TEAM") {
    return {
      scopeType,
      teamId: scopeId,
    }
  }

  return {
    scopeType,
    projectId: scopeId,
  }
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
    const isMember = await prisma.teamMember.findFirst({
      where: {
        teamId: board.teamId,
        userId,
      },
      select: { id: true },
    })

    return !!isMember
  }

  if (board.scopeType === "PROJECT" && board.projectId) {
    const isMember = await prisma.projectMember.findFirst({
      where: {
        projectId: board.projectId,
        userId,
      },
      select: { id: true },
    })

    return !!isMember
  }

  return false
}

export function normalizePlanningColor(
  color: string | undefined | null,
  fallback: string = DEFAULT_PLANNING_BOARD_COLOR
) {
  const normalized = sanitizeString(color || "", 20)
  return isValidHexColor(normalized) ? normalized : fallback
}

export function normalizePlanningCardColor(color: string | undefined | null) {
  return normalizePlanningColor(color, DEFAULT_PLANNING_CARD_COLOR)
}

export function normalizePlanningBucketWidth(
  width: unknown,
  fallback: number = DEFAULT_PLANNING_BUCKET_WIDTH
) {
  const numericWidth =
    typeof width === "number"
      ? width
      : typeof width === "string"
        ? Number(width)
        : fallback

  if (!Number.isFinite(numericWidth)) {
    return fallback
  }

  return Math.min(
    MAX_PLANNING_BUCKET_WIDTH,
    Math.max(MIN_PLANNING_BUCKET_WIDTH, Math.round(numericWidth))
  )
}

export function sanitizePlanningText(value: string | undefined | null, maxLength = 120) {
  return sanitizeString(value || "", maxLength)
}

export function sanitizePlanningIdList(values: unknown, maxLength = 80) {
  if (!Array.isArray(values)) {
    return [] as string[]
  }

  return Array.from(
    new Set(
      values
        .map((value) =>
          typeof value === "string" ? sanitizePlanningText(value, maxLength) : ""
        )
        .filter((value): value is string => Boolean(value))
    )
  )
}
