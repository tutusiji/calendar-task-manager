import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse
} from '@/lib/api-response'

// POST /api/teams/[id]/leave - 退出团队
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params

    // 检查团队是否存在
    const team = await prisma.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        creatorId: true
      }
    })

    if (!team) {
      return notFoundResponse('团队不存在')
    }

    // 创建者不能退出自己的团队
    if (team.creatorId === auth.userId) {
      return forbiddenResponse('创建者不能退出自己创建的团队')
    }

    // 检查用户是否是团队成员
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: id,
        userId: auth.userId
      }
    })

    if (!membership) {
      return forbiddenResponse('您不是该团队的成员')
    }

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true },
    })

    // 删除成员关系
    await prisma.teamMember.delete({
      where: {
        id: membership.id
      }
    })

    // 发送通知给创建者
    if (currentUser && team.creatorId !== auth.userId) {
      await prisma.notification.create({
        data: {
          userId: team.creatorId,
          type: "TASK_ASSIGNED",
          title: "成员退出团队",
          content: `${currentUser.name} 退出了团队「${team.name}」`,
          metadata: {
            teamId: team.id,
            teamName: team.name,
            leaveMemberId: currentUser.id,
            leaveMemberName: currentUser.name,
          },
        },
      })
    }

    return successResponse(
      { teamId: id },
      `已成功退出团队 "${team.name}"`
    )
  } catch (error) {
    console.error('Error leaving team:', error)
    return serverErrorResponse('退出团队失败')
  }
}
