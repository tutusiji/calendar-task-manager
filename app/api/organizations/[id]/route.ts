import { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"

// GET /api/organizations/[id] - 获取单个组织详情
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse("未授权", 401)
    }

    const { id } = params

    // 检查用户是否是该组织的成员
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: id,
        },
      },
    })

    if (!member) {
      return errorResponse("无权访问该组织", 403)
    }

    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
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
        },
        teams: {
          select: {
            id: true,
            name: true,
            color: true,
            _count: {
              select: { members: true },
            },
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            color: true,
            _count: {
              select: { members: true },
            },
          },
        },
        _count: {
          select: {
            members: true,
            teams: true,
            projects: true,
          },
        },
      },
    })

    if (!organization) {
      return errorResponse("组织不存在", 404)
    }

    return successResponse({
      id: organization.id,
      name: organization.name,
      description: organization.description,
      isVerified: organization.isVerified,
      creatorId: organization.creatorId,
      members: organization.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
        createdAt: m.createdAt,
      })),
      teams: organization.teams,
      projects: organization.projects,
      memberCount: organization._count.members,
      teamCount: organization._count.teams,
      projectCount: organization._count.projects,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    })
  } catch (error) {
    console.error("获取组织详情失败:", error)
    return errorResponse("获取组织详情失败")
  }
}

// PUT /api/organizations/[id] - 更新组织
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse("未授权", 401)
    }

    const { id } = params
    const body = await req.json()
    const { name, description } = body

    // 检查用户是否是该组织的所有者或管理员
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: id,
        },
      },
    })

    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      return errorResponse("无权修改该组织", 403)
    }

    // 如果要修改名称，检查新名称是否已被使用
    if (name && name.trim().length > 0) {
      const existingOrg = await prisma.organization.findFirst({
        where: {
          name: name.trim(),
          id: { not: id },
        },
      })

      if (existingOrg) {
        return errorResponse("该组织名称已存在")
      }
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
      },
    })

    return successResponse(organization)
  } catch (error) {
    console.error("更新组织失败:", error)
    return errorResponse("更新组织失败")
  }
}

// DELETE /api/organizations/[id] - 删除组织
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse("未授权", 401)
    }

    const { id } = params

    // 检查用户是否是该组织的所有者
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: id,
        },
      },
    })

    if (!member || member.role !== "OWNER") {
      return errorResponse("只有组织所有者可以删除组织", 403)
    }

    // 检查是否是用户当前所在的组织
    if (user.currentOrganizationId === id) {
      return errorResponse("不能删除当前所在的组织", 400)
    }

    // 删除组织（级联删除会自动处理相关数据）
    await prisma.organization.delete({
      where: { id },
    })

    return successResponse({ message: "组织已删除" })
  } catch (error) {
    console.error("删除组织失败:", error)
    return errorResponse("删除组织失败")
  }
}
