import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"

// GET /api/notifications - 获取当前用户的消息列表
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const searchParams = req.nextUrl.searchParams
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    // 获取30天内的消息
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const whereClause: any = {
      userId: auth.userId,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    }

    if (unreadOnly) {
      whereClause.isRead = false
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // 最多返回100条
    })

    return successResponse(notifications)
  } catch (error) {
    console.error("获取消息列表失败:", error)
    return errorResponse("获取消息列表失败")
  }
}

// GET /api/notifications/unread-count - 获取未读消息数量
export async function HEAD(req: NextRequest) {
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
