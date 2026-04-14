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
  normalizePlanningColor,
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
    const board = await prisma.planningBoard.findUnique({
      where: { id },
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

    const body = await request.json()
    const name = body.name !== undefined ? sanitizePlanningText(body.name, 80) : undefined
    const description =
      body.description !== undefined
        ? sanitizePlanningText(body.description, 500)
        : undefined

    if (name !== undefined && !name) {
      return validationErrorResponse("计划板名称不能为空")
    }

    const updated = await prisma.planningBoard.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(body.color !== undefined
          ? { color: normalizePlanningColor(body.color) }
          : {}),
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error("更新计划板失败:", error)
    return serverErrorResponse("更新计划板失败")
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
    const board = await prisma.planningBoard.findUnique({
      where: { id },
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
      return forbiddenResponse("无权删除该计划板")
    }

    await prisma.planningBoard.delete({
      where: { id },
    })

    return successResponse(null, "计划板已删除")
  } catch (error) {
    console.error("删除计划板失败:", error)
    return serverErrorResponse("删除计划板失败")
  }
}
