import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse
} from '@/lib/api-response'

// POST /api/projects/[id]/leave - 退出项目
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        creatorId: true
      }
    })

    if (!project) {
      return notFoundResponse('项目不存在')
    }

    // 创建者不能退出自己的项目
    if (project.creatorId === auth.userId) {
      return forbiddenResponse('创建者不能退出自己创建的项目')
    }

    // 检查用户是否是项目成员
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: id,
        userId: auth.userId
      }
    })

    if (!membership) {
      return forbiddenResponse('您不是该项目的成员')
    }

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true },
    })

    // 删除成员关系
    await prisma.projectMember.delete({
      where: {
        id: membership.id
      }
    })

    // 发送通知给创建者
    if (currentUser && project.creatorId !== auth.userId) {
      await prisma.notification.create({
        data: {
          userId: project.creatorId,
          type: "TASK_ASSIGNED",
          title: "成员退出项目",
          content: `${currentUser.name} 退出了项目「${project.name}」`,
          metadata: {
            projectId: project.id,
            projectName: project.name,
            leaveMemberId: currentUser.id,
            leaveMemberName: currentUser.name,
          },
        },
      })
    }

    return successResponse(
      { projectId: id },
      `已成功退出项目 "${project.name}"`
    )
  } catch (error) {
    console.error('Error leaving project:', error)
    return serverErrorResponse('退出项目失败')
  }
}
