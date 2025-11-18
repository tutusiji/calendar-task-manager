import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import {
  successResponse,
  errorResponse,
  serverErrorResponse
} from '@/lib/api-response'

// GET /api/organizations/[id]/invite-code - 获取当前用户在该组织的邀请码
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户身份
    const authResult = await authenticate(request)
    if (authResult.error) {
      return authResult.error
    }

    const { id: organizationId } = await context.params
    const userId = authResult.userId

    // 检查用户是否是该组织的成员,并获取邀请码
    const member = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId
        }
      },
      select: {
        inviteCode: true
      }
    })

    if (!member) {
      return errorResponse('您不是该组织的成员', 403)
    }

    if (!member.inviteCode) {
      return errorResponse('邀请码尚未生成', 404)
    }

    return successResponse({
      inviteCode: member.inviteCode
    })
  } catch (error) {
    console.error('Error fetching invite code:', error)
    return serverErrorResponse('获取邀请码失败')
  }
}
