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

    if (content !== undefined && !content) {
      return validationErrorResponse("事项内容不能为空")
    }

    const isCompleted =
      body.isCompleted !== undefined ? Boolean(body.isCompleted) : undefined

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
