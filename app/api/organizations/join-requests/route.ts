import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"

// POST /api/organizations/join-requests - 创建加入组织的申请
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const body = await req.json()
    const { organizationId, message } = body

    if (!organizationId) {
      return errorResponse("组织ID不能为空")
    }

    // 验证组织是否存在
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!organization) {
      return errorResponse("组织不存在", 404)
    }

    // 检查是否已经是成员
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: auth.userId,
          organizationId,
        },
      },
    })

    if (existingMember) {
      return errorResponse("您已经是该组织的成员")
    }

    // 检查是否已有待处理的申请
    const existingRequest = await prisma.organizationJoinRequest.findFirst({
      where: {
        organizationId,
        applicantId: auth.userId,
        status: "PENDING",
      },
    })

    if (existingRequest) {
      return errorResponse("您已提交过申请，请等待审核")
    }

    // 创建申请
    const request = await prisma.organizationJoinRequest.create({
      data: {
        organizationId,
        applicantId: auth.userId,
        message,
        status: "PENDING",
      },
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // 给组织创建者发送通知
    await prisma.notification.create({
      data: {
        userId: organization.creatorId,
        type: "ORG_JOIN_REQUEST",
        title: "新的加入申请",
        content: `${request.applicant.name} 申请加入 ${organization.name}`,
        metadata: {
          requestId: request.id,
          organizationId: organization.id,
          organizationName: organization.name,
          applicantId: request.applicant.id,
          applicantName: request.applicant.name,
          message: message || "",
        },
      },
    })

    return successResponse(request, "申请已提交")
  } catch (error) {
    console.error("创建加入申请失败:", error)
    return errorResponse("创建加入申请失败")
  }
}

// GET /api/organizations/join-requests - 获取加入申请列表
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const searchParams = req.nextUrl.searchParams
    const organizationId = searchParams.get("organizationId")
    const asApplicant = searchParams.get("asApplicant") === "true"

    let whereClause: any = {}

    if (asApplicant) {
      // 作为申请人，查看自己的申请
      whereClause.applicantId = auth.userId
    } else if (organizationId) {
      // 作为管理员，查看某个组织的申请
      // 验证是否有权限
      const member = await prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: auth.userId,
            organizationId,
          },
        },
      })

      if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        return errorResponse("无权查看此组织的申请", 403)
      }

      whereClause.organizationId = organizationId
    } else {
      // 查看自己作为管理员的所有组织的申请
      const ownedOrgs = await prisma.organizationMember.findMany({
        where: {
          userId: auth.userId,
          role: {
            in: ["OWNER", "ADMIN"],
          },
        },
        select: {
          organizationId: true,
        },
      })

      whereClause.organizationId = {
        in: ownedOrgs.map((o) => o.organizationId),
      }
    }

    const requests = await prisma.organizationJoinRequest.findMany({
      where: whereClause,
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        handler: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return successResponse(requests)
  } catch (error) {
    console.error("获取加入申请失败:", error)
    return errorResponse("获取加入申请失败")
  }
}
