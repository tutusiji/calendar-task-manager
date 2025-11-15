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
 * 加入项目
 * POST /api/projects/:id/join
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id: projectId } = await params

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
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

    if (!project) {
      return notFoundResponse("项目不存在")
    }

    // 检查是否已经是成员
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: auth.userId,
          projectId: projectId,
        },
      },
    })

    if (existingMember) {
      return errorResponse("您已经是该项目的成员", 400)
    }

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true },
    })

    if (!currentUser) {
      return errorResponse("用户不存在", 404)
    }

    // 加入项目
    await prisma.projectMember.create({
      data: {
        userId: auth.userId,
        projectId: projectId,
      },
    })

    // 发送通知给创建者（如果不是创建者自己加入）
    if (project.creatorId !== auth.userId) {
      await (prisma as any).notification.create({
        data: {
          userId: project.creatorId,
          type: "TASK_ASSIGNED",
          title: "新成员加入项目",
          content: `${currentUser.name} 加入了项目「${project.name}」`,
          metadata: {
            projectId: project.id,
            projectName: project.name,
            newMemberId: currentUser.id,
            newMemberName: currentUser.name,
          },
        },
      })
    }

    return successResponse({
      message: "加入项目成功",
    })
  } catch (error) {
    console.error("Join project error:", error)
    return serverErrorResponse("加入项目失败")
  }
}
