import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"

// POST /api/organizations/join-requests/[id]/approve - 同意加入申请
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { id } = await params

    // 获取申请信息
    const request = await prisma.organizationJoinRequest.findUnique({
      where: { id },
      include: {
        organization: true,
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!request) {
      return errorResponse("申请不存在", 404)
    }

    if (request.status !== "PENDING") {
      return errorResponse("申请已被处理")
    }

    // 验证权限
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: auth.userId,
          organizationId: request.organizationId,
        },
      },
    })

    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return errorResponse("无权处理此申请", 403)
    }

    // 使用事务处理
    const result = await prisma.$transaction(async (tx) => {
      // 1. 更新申请状态
      const updatedRequest = await tx.organizationJoinRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          handledBy: auth.userId,
          handledAt: new Date(),
        },
      })

      // 2. 添加用户为组织成员
      await tx.organizationMember.create({
        data: {
          userId: request.applicantId,
          organizationId: request.organizationId,
          role: "MEMBER",
        },
      })

      // 3. 如果申请人没有当前组织，设置为新加入的组织
      const applicant = await tx.user.findUnique({
        where: { id: request.applicantId },
        select: { currentOrganizationId: true },
      })

      if (!applicant?.currentOrganizationId) {
        await tx.user.update({
          where: { id: request.applicantId },
          data: { currentOrganizationId: request.organizationId },
        })
      }

      // 4. 给申请人发送通知
      await tx.notification.create({
        data: {
          userId: request.applicantId,
          type: "ORG_JOIN_APPROVED",
          title: "加入申请已通过",
          content: `您加入 ${request.organization.name} 的申请已通过`,
          metadata: {
            requestId: request.id,
            organizationId: request.organization.id,
            organizationName: request.organization.name,
          },
        },
      })

      return updatedRequest
    })

    return successResponse(result, "已同意申请")
  } catch (error) {
    console.error("处理加入申请失败:", error)
    return errorResponse("处理加入申请失败")
  }
}
