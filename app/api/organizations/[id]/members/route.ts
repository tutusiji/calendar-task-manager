import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"

// POST /api/organizations/[id]/members - 添加成员到组织
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse("未授权", 401)
    }

    const { id: organizationId } = params
    const body = await req.json()
    const { userId, role = "MEMBER" } = body

    if (!userId) {
      return errorResponse("用户ID不能为空")
    }

    // 检查当前用户是否有权限添加成员
    const currentMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
    })

    if (!currentMember || (currentMember.role !== "OWNER" && currentMember.role !== "ADMIN")) {
      return errorResponse("无权添加成员", 403)
    }

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return errorResponse("目标用户不存在", 404)
    }

    // 检查用户是否已经是成员
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    })

    if (existingMember) {
      return errorResponse("用户已经是组织成员")
    }

    // 添加成员
    const member = await prisma.organizationMember.create({
      data: {
        userId,
        organizationId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    })

    return successResponse(member)
  } catch (error) {
    console.error("添加组织成员失败:", error)
    return errorResponse("添加组织成员失败")
  }
}

// DELETE /api/organizations/[id]/members - 移除组织成员
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse("未授权", 401)
    }

    const { id: organizationId } = params
    const searchParams = req.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return errorResponse("用户ID不能为空")
    }

    // 检查当前用户是否有权限移除成员
    const currentMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
    })

    if (!currentMember || (currentMember.role !== "OWNER" && currentMember.role !== "ADMIN")) {
      return errorResponse("无权移除成员", 403)
    }

    // 不能移除组织所有者
    const targetMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    })

    if (!targetMember) {
      return errorResponse("成员不存在", 404)
    }

    if (targetMember.role === "OWNER") {
      return errorResponse("不能移除组织所有者")
    }

    // 移除成员
    await prisma.organizationMember.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    })

    return successResponse({ message: "成员已移除" })
  } catch (error) {
    console.error("移除组织成员失败:", error)
    return errorResponse("移除组织成员失败")
  }
}
