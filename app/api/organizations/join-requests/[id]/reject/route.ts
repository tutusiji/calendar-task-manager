import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"

// POST /api/organizations/join-requests/[id]/reject - 拒绝加入申请
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { id } = await params
    const body = await req.json()
    const { reason } = body

    // 获取申请信息
    const request = await prisma.organizationJoinRequest.findUnique({
      where: { id },
      include: {
        organization: true,
        applicant: {
          select: {
            id: true,
            name: true,
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
          status: "REJECTED",
          handledBy: auth.userId,
          handledAt: new Date(),
          rejectReason: reason,
        },
      })

      // 2. 给申请人发送通知
      await tx.notification.create({
        data: {
          userId: request.applicantId,
          type: "ORG_JOIN_REJECTED",
          title: "加入申请被拒绝",
          content: `您加入 ${request.organization.name} 的申请被拒绝${
            reason ? `：${reason}` : ""
          }`,
          metadata: {
            requestId: request.id,
            organizationId: request.organization.id,
            organizationName: request.organization.name,
            reason: reason || "",
          },
        },
      })

      return updatedRequest
    })

    return successResponse(result, "已拒绝申请")
  } catch (error) {
    console.error("处理加入申请失败:", error)
    return errorResponse("处理加入申请失败")
  }
}
