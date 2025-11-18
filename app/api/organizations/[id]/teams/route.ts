import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { successResponse, errorResponse } from "@/lib/api-response"
import { authenticate } from "@/lib/middleware"

// GET /api/organizations/[id]/teams - 获取指定组织的团队列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(req)
    if (auth.error) return auth.error

    const { id: organizationId } = await params

    // 验证用户是否是该组织的成员
    const currentMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: auth.userId,
          organizationId,
        },
      },
    })

    if (!currentMember) {
      return errorResponse("无权查看该组织团队", 403)
    }

    // 获取该组织的所有团队
    const teams = await prisma.team.findMany({
      where: {
        organizationId,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // 格式化响应数据
    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      color: team.color,
      description: team.description,
      memberCount: team._count.members,
      members: team.members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar,
        role: m.role,
      })),
      creator: team.creator,
      createdAt: team.createdAt,
    }))

    return successResponse(formattedTeams)
  } catch (error) {
    console.error("获取组织团队失败:", error)
    return errorResponse("获取组织团队失败")
  }
}
