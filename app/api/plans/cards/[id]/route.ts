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
  normalizePlanningCardColor,
  sanitizePlanningIdList,
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
    const card = await prisma.planningCard.findUnique({
      where: { id },
      select: {
        id: true,
        bucketId: true,
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
    })

    if (!card) {
      return notFoundResponse("卡片不存在")
    }

    const canAccess = await canUserAccessPlanningBoard(auth.userId, card.bucket.board)
    if (!canAccess) {
      return forbiddenResponse("无权修改该卡片")
    }

    const body = await request.json()
    const title = body.title !== undefined ? sanitizePlanningText(body.title, 120) : undefined
    const description =
      body.description !== undefined
        ? sanitizePlanningText(body.description, 1000)
        : undefined

    if (title !== undefined && !title) {
      return validationErrorResponse("卡片标题不能为空")
    }

    await prisma.$transaction(async (tx) => {
      await tx.planningCard.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(body.headerColor !== undefined
            ? { headerColor: normalizePlanningCardColor(body.headerColor) }
            : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) || 0 } : {}),
        },
      })

      if (body.assigneeIds !== undefined) {
        const assigneeIds = sanitizePlanningIdList(body.assigneeIds)

        await tx.planningCardAssignee.deleteMany({
          where: { cardId: id },
        })

        if (assigneeIds.length) {
          await tx.planningCardAssignee.createMany({
            data: assigneeIds.map((userId) => ({
              cardId: id,
              userId,
            })),
          })
        }
      }
    })

    return successResponse(null, "卡片已更新")
  } catch (error) {
    console.error("更新卡片失败:", error)
    return serverErrorResponse("更新卡片失败")
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
    const card = await prisma.planningCard.findUnique({
      where: { id },
      select: {
        id: true,
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
    })

    if (!card) {
      return notFoundResponse("卡片不存在")
    }

    const canAccess = await canUserAccessPlanningBoard(auth.userId, card.bucket.board)
    if (!canAccess) {
      return forbiddenResponse("无权删除该卡片")
    }

    await prisma.planningCard.delete({
      where: { id },
    })

    return successResponse(null, "卡片已删除")
  } catch (error) {
    console.error("删除卡片失败:", error)
    return serverErrorResponse("删除卡片失败")
  }
}
