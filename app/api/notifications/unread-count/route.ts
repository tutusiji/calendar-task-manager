import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"

// GET /api/notifications/unread-count - 获取未读消息数量
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const count = await prisma.notification.count({
      where: {
        userId: auth.userId,
        isRead: false,
      },
    })

    return successResponse({ count })
  } catch (error) {
    console.error("获取未读消息数量失败:", error)
    return errorResponse("获取未读消息数量失败")
  }
}
