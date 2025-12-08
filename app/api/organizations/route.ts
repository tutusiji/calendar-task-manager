import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"
import { randomBytes } from "crypto"

// 生成短邀请码(8位)
function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

// GET /api/organizations - 获取用户的所有组织
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get("search")

    // 如果有搜索参数，则搜索所有组织（用于注册时的搜索，不需要认证）
    if (search) {
      const organizations = await prisma.organization.findMany({
        where: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          isVerified: true,
          description: true,
        },
        take: 10,
      })
      return successResponse(organizations)
    }

    // 否则需要认证才能获取用户的组织列表
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const organizationId = searchParams.get('organizationId')

    const where: any = {
      userId: auth.userId,
    }

    if (organizationId) {
      where.organizationId = organizationId
    }

    // 返回用户所属的所有组织
    const organizationMembers = await prisma.organizationMember.findMany({
      where,
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                teams: true,
                projects: true,
              },
            },
          },
        },
      },
    })

    const organizations = organizationMembers.map((om) => ({
      id: om.organization.id,
      name: om.organization.name,
      description: om.organization.description,
      isVerified: om.organization.isVerified,
      creatorId: om.organization.creatorId,
      joinRequiresApproval: om.organization.joinRequiresApproval,
      role: om.role,
      memberCount: om.organization._count.members,
      teamCount: om.organization._count.teams,
      projectCount: om.organization._count.projects,
      createdAt: om.organization.createdAt,
    }))

    return successResponse(organizations)
  } catch (error) {
    console.error("获取组织列表失败:", error)
    return errorResponse("获取组织列表失败")
  }
}

// POST /api/organizations - 创建新组织
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const body = await req.json()
    const { name, description } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("组织名称不能为空")
    }

    // 检查组织名称是否已存在
    const existingOrg = await prisma.organization.findUnique({
      where: { name: name.trim() },
    })

    if (existingOrg) {
      return errorResponse("该组织名称已存在")
    }

    // 获取当前用户
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { currentOrganizationId: true },
    })

    // 为创建者生成唯一的邀请码
    let memberInviteCode = generateInviteCode()
    let exists = await prisma.organizationMember.findFirst({ 
      where: { inviteCode: memberInviteCode } 
    })
    while (exists) {
      memberInviteCode = generateInviteCode()
      exists = await prisma.organizationMember.findFirst({ 
        where: { inviteCode: memberInviteCode } 
      })
    }

    // 创建组织
    const organization = await prisma.organization.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        creatorId: auth.userId,
        isVerified: true, // 新创建的组织默认已认证
        joinRequiresApproval: false, // 默认不需要审批
        members: {
          create: {
            userId: auth.userId,
            role: "OWNER", // 创建者自动成为所有者
            inviteCode: memberInviteCode, // 为创建者生成邀请码
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
            teams: true,
            projects: true,
          },
        },
      },
    })

    // 获取创建者信息用于创建个人项目
    const creator = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true }
    })

    // 为创建者创建个人项目
    await prisma.project.create({
      data: {
        name: `${creator?.name || '我'}的个人事务`,
        color: '#3b82f6',
        description: '个人日常任务和事项',
        organizationId: organization.id,
        creatorId: auth.userId,
        members: {
          create: {
            userId: auth.userId
          }
        }
      }
    })

    // 如果用户当前没有选择的组织，自动设置为新创建的组织
    if (!currentUser?.currentOrganizationId) {
      await prisma.user.update({
        where: { id: auth.userId },
        data: { currentOrganizationId: organization.id },
      })
    }

    return successResponse({
      id: organization.id,
      name: organization.name,
      description: organization.description,
      isVerified: organization.isVerified,
      creatorId: organization.creatorId,
      memberCount: organization._count.members,
      teamCount: organization._count.teams,
      projectCount: organization._count.projects,
      createdAt: organization.createdAt,
    })
  } catch (error) {
    console.error("创建组织失败:", error)
    return errorResponse("创建组织失败")
  }
}
