import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"

// DELETE /api/notifications/[id] - 删除单条通知
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { id } = await params

    // 验证通知是否存在且属于当前用户
    const notification = await prisma.notification.findUnique({
      where: { id },
    })

    if (!notification) {
      return errorResponse("通知不存在", 404)
    }

    if (notification.userId !== auth.userId) {
      return errorResponse("无权删除此通知", 403)
    }

    // 删除通知
    await prisma.notification.delete({
      where: { id },
    })

    return successResponse(null, "删除成功")
  } catch (error) {
    console.error("删除通知失败:", error)
    return errorResponse(
      `删除通知失败: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
