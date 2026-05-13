import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate } from "@/lib/middleware"
import {
  successResponse,
  validationErrorResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-response"
import {
  canUserAccessPlanningBoard,
  sanitizePlanningText,
} from "@/lib/planning-server"
import { PLANNING_SORT_GAP } from "@/lib/planning"

type ReorderPosition = "before" | "after"

function computeSparseSortOrder(
  previousSortOrder: number | null,
  nextSortOrder: number | null
) {
  if (previousSortOrder === null && nextSortOrder === null) {
    return 0
  }

  if (previousSortOrder === null) {
    return nextSortOrder! - PLANNING_SORT_GAP
  }

  if (nextSortOrder === null) {
    return previousSortOrder + PLANNING_SORT_GAP
  }

  const gap = nextSortOrder - previousSortOrder
  if (gap <= 1) {
    return null
  }

  return previousSortOrder + Math.floor(gap / 2)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params
    const item = await prisma.planningCardItem.findUnique({
      where: { id },
      select: {
        id: true,
        cardId: true,
        card: {
          select: {
            bucket: {
              select: {
                board: {
                  select: {
                    scopeType: true,
                    ownerUserId: true,
                    teamId: true,
                    projectId: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!item) {
      return notFoundResponse("事项不存在")
    }

    const canAccess = await canUserAccessPlanningBoard(auth.userId, item.card.bucket.board)
    if (!canAccess) {
      return forbiddenResponse("无权修改该事项")
    }

    const body = await request.json()
    const content = body.content !== undefined ? sanitizePlanningText(body.content, 240) : undefined
    const targetItemId =
      body.targetItemId !== undefined
        ? sanitizePlanningText(body.targetItemId, 80)
        : undefined
    const position =
      body.position === "before" || body.position === "after"
        ? (body.position as ReorderPosition)
        : undefined

    if (content !== undefined && !content) {
      return validationErrorResponse("事项内容不能为空")
    }

    const isCompleted =
      body.isCompleted !== undefined ? Boolean(body.isCompleted) : undefined

    const wantsReorder = targetItemId !== undefined || position !== undefined

    if (wantsReorder) {
      if (!targetItemId || !position) {
        return validationErrorResponse("缺少目标事项或排序位置")
      }

      if (targetItemId === id) {
        const currentItem = await prisma.planningCardItem.findUnique({
          where: { id },
        })
        return successResponse({
          item: currentItem,
          affectedItems: currentItem
            ? [{ id: currentItem.id, sortOrder: currentItem.sortOrder }]
            : [],
        })
      }

      const reorderResult = await prisma.$transaction(async (tx) => {
        const itemsInCard = await tx.planningCardItem.findMany({
          where: { cardId: item.cardId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })

        const movingItem = itemsInCard.find((entry) => entry.id === id)
        const targetItem = itemsInCard.find((entry) => entry.id === targetItemId)

        if (!movingItem || !targetItem) {
          throw new Error("排序目标不存在")
        }

        const remainingItems = itemsInCard.filter((entry) => entry.id !== id)
        const targetIndex = remainingItems.findIndex((entry) => entry.id === targetItemId)

        if (targetIndex === -1) {
          throw new Error("排序目标不存在")
        }

        const insertIndex = position === "after" ? targetIndex + 1 : targetIndex
        const previousItem = remainingItems[insertIndex - 1] || null
        const nextItem = remainingItems[insertIndex] || null
        const nextSortOrder = computeSparseSortOrder(
          previousItem?.sortOrder ?? null,
          nextItem?.sortOrder ?? null
        )

        if (nextSortOrder !== null) {
          const updatedItem = await tx.planningCardItem.update({
            where: { id },
            data: {
              sortOrder: nextSortOrder,
            },
          })

          return {
            item: updatedItem,
            affectedItems: [{ id: updatedItem.id, sortOrder: updatedItem.sortOrder }],
          }
        }

        const reorderedItems = [...remainingItems]
        reorderedItems.splice(insertIndex, 0, movingItem)

        const normalizedAssignments = reorderedItems.map((entry, index) => ({
          id: entry.id,
          sortOrder: index * PLANNING_SORT_GAP,
        }))

        await Promise.all(
          normalizedAssignments
            .filter((assignment) => {
              const currentItem = itemsInCard.find((entry) => entry.id === assignment.id)
              return currentItem?.sortOrder !== assignment.sortOrder
            })
            .map((assignment) =>
              tx.planningCardItem.update({
                where: { id: assignment.id },
                data: { sortOrder: assignment.sortOrder },
              })
            )
        )

        const updatedItem = await tx.planningCardItem.findUnique({
          where: { id },
        })

        return {
          item: updatedItem,
          affectedItems: normalizedAssignments,
        }
      })

      return successResponse(reorderResult)
    }

    const updated = await prisma.planningCardItem.update({
      where: { id },
      data: {
        ...(content !== undefined ? { content } : {}),
        ...(isCompleted !== undefined
          ? {
              isCompleted,
              completedAt: isCompleted ? new Date() : null,
            }
          : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) || 0 } : {}),
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error("更新事项失败:", error)
    return serverErrorResponse("更新事项失败")
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params
    const item = await prisma.planningCardItem.findUnique({
      where: { id },
      select: {
        id: true,
        card: {
          select: {
            bucket: {
              select: {
                board: {
                  select: {
                    scopeType: true,
                    ownerUserId: true,
                    teamId: true,
                    projectId: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!item) {
      return notFoundResponse("事项不存在")
    }

    const canAccess = await canUserAccessPlanningBoard(auth.userId, item.card.bucket.board)
    if (!canAccess) {
      return forbiddenResponse("无权删除该事项")
    }

    await prisma.planningCardItem.delete({
      where: { id },
    })

    return successResponse(null, "事项已删除")
  } catch (error) {
    console.error("删除事项失败:", error)
    return serverErrorResponse("删除事项失败")
  }
}
