import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  successResponse,
  errorResponse,
  serverErrorResponse
} from '@/lib/api-response'

// POST /api/organizations/[id]/invite-code/validate - 验证邀请码是否有效
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { inviteCode } = body
    const { id: organizationId } = await context.params

    if (!inviteCode) {
      return errorResponse('邀请码不能为空', 400)
    }

    // 查找该组织中拥有该邀请码的成员
    const member = await prisma.organizationMember.findFirst({
      where: { 
        inviteCode,
        organizationId
      },
      select: { 
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!member) {
      return errorResponse('邀请码无效或不属于此组织', 404)
    }

    return successResponse({
      valid: true,
      inviterName: member.user.name
    })
  } catch (error) {
    console.error('Error validating invite code:', error)
    return serverErrorResponse('验证邀请码失败')
  }
}
