import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import {
  forbiddenResponse,
  successResponse,
  validationErrorResponse,
  serverErrorResponse
} from '@/lib/api-response'

// PUT /api/teams/reorder - 更新团队侧边栏排序
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const teamIds = body.teamIds

    if (!Array.isArray(teamIds) || teamIds.some((id) => typeof id !== 'string')) {
      return validationErrorResponse('团队排序数据无效')
    }

    if (teamIds.length === 0) {
      return successResponse(null, '团队排序已更新')
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

    const validTeams = await prisma.team.findMany({
      where: {
        id: { in: teamIds },
        organizationId: user.currentOrganizationId
      },
      select: { id: true }
    })

    if (validTeams.length !== teamIds.length) {
      return validationErrorResponse('包含无效的团队')
    }

    await prisma.$transaction(
      teamIds.map((id, index) =>
        prisma.$executeRaw`
          UPDATE "Team"
          SET "sortOrder" = ${index}
          WHERE id = ${id}
            AND "organizationId" = ${user.currentOrganizationId}
        `
      )
    )

    return successResponse(null, '团队排序已更新')
  } catch (error) {
    console.error('Error reordering teams:', error)
    return serverErrorResponse('更新团队排序失败，请确认数据库迁移已执行')
  }
}
