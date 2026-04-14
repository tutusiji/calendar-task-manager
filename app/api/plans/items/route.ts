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

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const cardId = sanitizePlanningText(body.cardId, 80)
    const content = sanitizePlanningText(body.content, 240)

    if (!cardId) {
      return validationErrorResponse("缺少卡片 ID")
    }

    if (!content) {
      return validationErrorResponse("事项内容不能为空")
    }

    const card = await prisma.planningCard.findUnique({
      where: { id: cardId },
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
      return forbiddenResponse("无权在该卡片中创建事项")
    }

    const aggregate = await prisma.planningCardItem.aggregate({
      where: { cardId },
      _max: { sortOrder: true },
    })

    const item = await prisma.planningCardItem.create({
      data: {
        cardId,
        content,
        sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
      },
    })

    return successResponse(item, "事项已创建", 201)
  } catch (error) {
    console.error("创建事项失败:", error)
    return serverErrorResponse("创建事项失败")
  }
}
