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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params
    const bucket = await prisma.planningBucket.findUnique({
      where: { id },
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
      return forbiddenResponse("无权修改该分类列")
    }

    const body = await request.json()
    const title = body.title !== undefined ? sanitizePlanningText(body.title, 80) : undefined

    if (title !== undefined && !title) {
      return validationErrorResponse("分类列名称不能为空")
    }

    const updated = await prisma.planningBucket.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(body.width !== undefined ? { width: normalizePlanningBucketWidth(body.width) } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) || 0 } : {}),
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error("更新分类列失败:", error)
    return serverErrorResponse("更新分类列失败")
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
    const bucket = await prisma.planningBucket.findUnique({
      where: { id },
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
      return forbiddenResponse("无权删除该分类列")
    }

    await prisma.planningBucket.delete({
      where: { id },
    })

    return successResponse(null, "分类列已删除")
  } catch (error) {
    console.error("删除分类列失败:", error)
    return serverErrorResponse("删除分类列失败")
  }
}
