import type { Prisma } from "@prisma/client"
import { DEFAULT_PLANNING_BUCKET_TITLE, type PlanningScopeType } from "@/lib/planning"
import { prisma } from "@/lib/prisma"

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

export function findPlanningTeamMember(userId: string, teamId: string) {
  return prisma.teamMember.findFirst({ where: { userId, teamId }, select: { id: true } })
}

export function findPlanningProjectMember(userId: string, projectId: string) {
  return prisma.projectMember.findFirst({ where: { userId, projectId }, select: { id: true } })
}

export function findBoardsInScope(scopeType: PlanningScopeType, scopeId: string, summary: boolean) {
  return prisma.planningBoard.findMany({
    where: buildPlanningScopeWhere(scopeType, scopeId),
    ...(summary ? {} : { include: planningBoardInclude }),
    orderBy: [{ createdAt: "asc" }, { updatedAt: "asc" }],
  })
}

export function findPlanningBoardScope(id: string) {
  return prisma.planningBoard.findUnique({
    where: { id },
    select: { scopeType: true, ownerUserId: true, teamId: true, projectId: true },
  })
}

export function findPlanningBoardDetail(id: string) {
  return prisma.planningBoard.findUnique({ where: { id }, include: planningBoardInclude })
}

export function insertPlanningBoard(data: Prisma.PlanningBoardUncheckedCreateInput) {
  return prisma.planningBoard.create({
    data: {
      ...data,
      buckets: { create: [{ title: DEFAULT_PLANNING_BUCKET_TITLE, sortOrder: 0 }] },
    },
    include: planningBoardInclude,
  })
}
