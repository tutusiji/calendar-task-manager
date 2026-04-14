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
  normalizePlanningBucketWidth,
  sanitizePlanningText,
} from "@/lib/planning-server"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const boardId = sanitizePlanningText(body.boardId, 80)
    const title = sanitizePlanningText(body.title, 80)

    if (!boardId) {
      return validationErrorResponse("缺少计划板 ID")
    }

    if (!title) {
      return validationErrorResponse("分类列名称不能为空")
    }

    const board = await prisma.planningBoard.findUnique({
      where: { id: boardId },
      select: {
        id: true,
        scopeType: true,
        ownerUserId: true,
        teamId: true,
        projectId: true,
      },
    })

    if (!board) {
      return notFoundResponse("计划板不存在")
    }

    const canAccess = await canUserAccessPlanningBoard(auth.userId, board)
    if (!canAccess) {
      return forbiddenResponse("无权修改该计划板")
    }

    const aggregate = await prisma.planningBucket.aggregate({
      where: { boardId },
      _max: { sortOrder: true },
    })

    const bucket = await prisma.planningBucket.create({
      data: {
        boardId,
        title,
        width: normalizePlanningBucketWidth(body.width),
        sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
      },
    })

    return successResponse(bucket, "分类列已创建", 201)
  } catch (error) {
    console.error("创建分类列失败:", error)
    return serverErrorResponse("创建分类列失败")
  }
}
