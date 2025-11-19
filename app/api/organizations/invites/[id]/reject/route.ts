import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  validationErrorResponse,
  serverErrorResponse
} from '@/lib/api-response'

// POST /api/organizations/invites/[id]/reject - 拒绝组织邀请
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id: inviteId } = await params

    // 查找邀请记录
    const invite = await prisma.organizationInvite.findUnique({
      where: { id: inviteId },
      include: {
        organization: true,
      },
    })

    if (!invite) {
      return notFoundResponse('邀请不存在')
    }

    // 检查是否是被邀请人
    if (invite.invitedUserId !== auth.userId) {
      return forbiddenResponse('无权处理此邀请')
    }

    // 检查邀请状态
    if (invite.status !== 'PENDING') {
      return validationErrorResponse('该邀请已被处理')
    }

    // 使用事务处理
    await prisma.$transaction(async (tx) => {
      // 更新邀请状态
      await tx.organizationInvite.update({
        where: { id: inviteId },
        data: {
          status: 'REJECTED',
          respondedAt: new Date(),
        },
      })

      // 给邀请人发送通知
      await tx.notification.create({
        data: {
          userId: invite.inviterId,
          type: 'ORG_INVITE_REJECTED',
          title: '邀请被拒绝',
          content: `用户拒绝了你加入组织【${invite.organization.name}】的邀请`,
          metadata: {
            organizationId: invite.organizationId,
            organizationName: invite.organization.name,
            rejectedUserId: auth.userId,
          },
        },
      })
    })

    return successResponse(null, '已拒绝邀请')
  } catch (error) {
    console.error('拒绝邀请失败:', error)
    return serverErrorResponse('拒绝邀请失败')
  }
}
