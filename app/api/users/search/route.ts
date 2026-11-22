import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response'
import { requireOrgMember, requireUser } from '@/lib/server/auth/require'
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from '@/lib/server/security/rate-limit'

// GET /api/users/search - 搜索用户（仅限当前组织成员）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request)
    if ('error' in auth) return auth.error

    const searchLimit = checkRateLimit(
      `users-search:${auth.userId}`,
      60,
      60 * 1000
    )
    if (!searchLimit.allowed) {
      return rateLimitExceededResponse(searchLimit.retryAfterSeconds)
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return errorResponse('缺少组织参数', 400)
    }

    const organizationMember = await requireOrgMember(auth.userId, organizationId)
    if ('error' in organizationMember) return organizationMember.error

    if (!query || query.length < 2) {
      return successResponse([])
    }

    // 搜索用户(按用户名、姓名、邮箱)
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
      },
      take: 20,
    })

    // 过滤掉已经是该组织成员的用户
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true },
    })
    const memberIds = new Set(members.map(m => m.userId))

    return successResponse(users.filter(u => !memberIds.has(u.id)))
  } catch (error) {
    console.error('搜索用户失败:', error)
    return serverErrorResponse('搜索用户失败')
  }
}
