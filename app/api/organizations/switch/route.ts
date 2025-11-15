import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"

// POST /api/organizations/switch - 切换当前组织
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse("未授权", 401)
    }

    const body = await req.json()
    const { organizationId } = body

    if (!organizationId) {
      return errorResponse("组织ID不能为空")
    }

    // 验证用户是否是该组织的成员
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
    })

    if (!member) {
      return errorResponse("您不是该组织的成员", 403)
    }

    // 更新用户的当前组织
    await prisma.user.update({
      where: { id: user.id },
      data: { currentOrganizationId: organizationId },
    })

    return successResponse({ 
      message: "已切换组织",
      organizationId 
    })
  } catch (error) {
    console.error("切换组织失败:", error)
    return errorResponse("切换组织失败")
  }
}
