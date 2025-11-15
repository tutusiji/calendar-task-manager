import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"

// PATCH /api/notifications/[id]/read - 标记消息为已读
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { id } = await params

    // 验证消息属于当前用户
    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      return errorResponse("消息不存在", 404)
    }

    if (notification.userId !== auth.userId) {
      return errorResponse("无权操作此消息", 403)
    }

    // 标记为已读
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return successResponse(updated)
  } catch (error) {
    console.error("标记消息已读失败:", error)
    return errorResponse("标记消息已读失败")
  }
}
