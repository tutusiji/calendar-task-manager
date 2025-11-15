import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticate } from "@/lib/middleware"
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  serverErrorResponse
} from "@/lib/api-response"

/**
 * 加入团队
 * POST /api/teams/:id/join
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id: teamId } = await params

    // 检查团队是否存在
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!team) {
      return notFoundResponse("团队不存在")
    }

    // 检查是否已经是成员
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: auth.userId,
          teamId: teamId,
        },
      },
    })

    if (existingMember) {
      return errorResponse("您已经是该团队的成员", 400)
    }

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true },
    })

    if (!currentUser) {
      return errorResponse("用户不存在", 404)
    }

    // 加入团队
    await prisma.teamMember.create({
      data: {
        userId: auth.userId,
        teamId: teamId,
      },
    })

    // 发送通知给创建者（如果不是创建者自己加入）
    if (team.creatorId !== auth.userId) {
      await (prisma as any).notification.create({
        data: {
          userId: team.creatorId,
          type: "TASK_ASSIGNED",
          title: "新成员加入团队",
          content: `${currentUser.name} 加入了团队「${team.name}」`,
          metadata: {
            teamId: team.id,
            teamName: team.name,
            newMemberId: currentUser.id,
            newMemberName: currentUser.name,
          },
        },
      })
    }

    return successResponse({
      message: "加入团队成功",
    })
  } catch (error) {
    console.error("Join team error:", error)
    return serverErrorResponse("加入团队失败")
  }
}
