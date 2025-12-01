import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"

// DELETE /api/notifications/clear - 清空所有通知
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    // 删除当前用户的所有通知
    await prisma.notification.deleteMany({
      where: {
        userId: auth.userId,
      },
    })

    return successResponse(null, "已清空所有通知")
  } catch (error) {
    console.error("清空通知失败:", error)
    return errorResponse("清空通知失败")
  }
}
