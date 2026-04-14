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

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const bucketId = sanitizePlanningText(body.bucketId, 80)
    const title = sanitizePlanningText(body.title, 120)
    const description = sanitizePlanningText(body.description, 1000)
    const assigneeIds = sanitizePlanningIdList(body.assigneeIds)

    if (!bucketId) {
      return validationErrorResponse("缺少分类列 ID")
    }

    if (!title) {
      return validationErrorResponse("卡片标题不能为空")
    }

    const bucket = await prisma.planningBucket.findUnique({
      where: { id: bucketId },
      select: {
        id: true,
        board: {
          select: {
            scopeType: true,
            ownerUserId: true,
            teamId: true,
            projectId: true,
          },
        },
      },
    })

    if (!bucket) {
      return notFoundResponse("分类列不存在")
    }

    const canAccess = await canUserAccessPlanningBoard(auth.userId, bucket.board)
    if (!canAccess) {
      return forbiddenResponse("无权在该分类列中创建卡片")
    }

    const aggregate = await prisma.planningCard.aggregate({
      where: { bucketId },
      _max: { sortOrder: true },
    })

    const card = await prisma.planningCard.create({
      data: {
        bucketId,
        title,
        description: description || null,
        headerColor: normalizePlanningCardColor(body.headerColor),
        sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
        creatorId: auth.userId,
        assignees: assigneeIds.length
          ? {
              create: assigneeIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
    })

    return successResponse(card, "卡片已创建", 201)
  } catch (error) {
    console.error("创建卡片失败:", error)
    return serverErrorResponse("创建卡片失败")
  }
}
