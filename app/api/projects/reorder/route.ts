import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import {
  forbiddenResponse,
  successResponse,
  validationErrorResponse,
  serverErrorResponse
} from '@/lib/api-response'

// PUT /api/projects/reorder - 更新项目侧边栏排序
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const projectIds = body.projectIds

    if (!Array.isArray(projectIds) || projectIds.some((id) => typeof id !== 'string')) {
      return validationErrorResponse('项目排序数据无效')
    }

    if (projectIds.length === 0) {
      return successResponse(null, '项目排序已更新')
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { currentOrganizationId: true }
    })

    if (!user?.currentOrganizationId) {
      return validationErrorResponse('用户必须先选择组织')
    }

    const isMember = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: auth.userId,
          organizationId: user.currentOrganizationId
        }
      }
    })

    if (!isMember) {
      return forbiddenResponse('无权访问该组织的数据')
    }

    const validProjects = await prisma.project.findMany({
      where: {
        id: { in: projectIds },
        organizationId: user.currentOrganizationId
      },
      select: { id: true }
    })

    if (validProjects.length !== projectIds.length) {
      return validationErrorResponse('包含无效的项目')
    }

    await prisma.$transaction(
      projectIds.map((id, index) =>
        prisma.$executeRaw`
          UPDATE "Project"
          SET "sortOrder" = ${index}
          WHERE id = ${id}
            AND "organizationId" = ${user.currentOrganizationId}
        `
      )
    )

    return successResponse(null, '项目排序已更新')
  } catch (error) {
    console.error('Error reordering projects:', error)
    return serverErrorResponse('更新项目排序失败，请确认数据库迁移已执行')
  }
}
