import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import { successResponse, serverErrorResponse } from '@/lib/api-response'

// GET /api/users/search - 搜索用户
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const organizationId = searchParams.get('organizationId')

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

    // 如果提供了organizationId，过滤掉已经是该组织成员的用户
    if (organizationId) {
      const members = await prisma.organizationMember.findMany({
        where: { organizationId },
        select: { userId: true },
      })
      const memberIds = new Set(members.map(m => m.userId))
      
      const filteredUsers = users.filter(u => !memberIds.has(u.id))
      return successResponse(filteredUsers)
    }

    return successResponse(users)
  } catch (error) {
    console.error('搜索用户失败:', error)
    return serverErrorResponse('搜索用户失败')
  }
}
