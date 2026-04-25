import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  serverErrorResponse
} from '@/lib/api-response'

// POST /api/projects/[id]/archive - 归档项目
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params

    // 检查项目是否存在
    const existingProject = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingProject) {
      return notFoundResponse('项目不存在')
    }

    // 仅允许当前项目成员归档自己的项目标记
    const membership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: auth.userId,
          projectId: id,
        },
      },
    })

    if (!membership) {
      return forbiddenResponse('只有项目成员可以归档项目')
    }

    await prisma.$executeRaw`
      UPDATE "ProjectMember"
      SET
        "isArchived" = true,
        "archivedAt" = ${new Date()}
      WHERE "userId" = ${auth.userId}
        AND "projectId" = ${id}
    `

    return successResponse(
      {
        projectId: id,
        isArchived: true,
      },
      '项目已归档'
    )
  } catch (error) {
    console.error('Error archiving project:', error)
    return serverErrorResponse('归档项目失败，请确认数据库迁移已执行')
  }
}

// DELETE /api/projects/[id]/archive - 取消归档项目
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id } = await params

    // 检查项目是否存在
    const existingProject = await prisma.project.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingProject) {
      return notFoundResponse('项目不存在')
    }

    const membership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: auth.userId,
          projectId: id,
        },
      },
    })

    if (!membership) {
      return forbiddenResponse('只有项目成员可以取消归档项目')
    }

    await prisma.$executeRaw`
      UPDATE "ProjectMember"
      SET
        "isArchived" = false,
        "archivedAt" = null
      WHERE "userId" = ${auth.userId}
        AND "projectId" = ${id}
    `

    return successResponse(
      {
        projectId: id,
        isArchived: false,
      },
      '项目已取消归档'
    )
  } catch (error) {
    console.error('Error unarchiving project:', error)
    return serverErrorResponse('取消归档项目失败，请确认数据库迁移已执行')
  }
}
