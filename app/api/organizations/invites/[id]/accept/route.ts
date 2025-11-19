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

// POST /api/organizations/invites/[id]/accept - 接受组织邀请
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
        inviter: {
          select: { id: true, name: true, username: true },
        },
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

    // 检查是否已经是组织成员
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: invite.organizationId,
        userId: auth.userId,
      },
    })

    if (existingMember) {
      // 更新邀请状态为已接受
      await prisma.organizationInvite.update({
        where: { id: inviteId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      })
      return validationErrorResponse('你已经是该组织成员')
    }

    // 使用事务处理
    await prisma.$transaction(async (tx) => {
      // 更新邀请状态
      await tx.organizationInvite.update({
        where: { id: inviteId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      })

      // 生成邀请码
      const generateInviteCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let code = ''
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return code
      }

      let memberInviteCode = generateInviteCode()
      let exists = await tx.organizationMember.findFirst({
        where: { inviteCode: memberInviteCode },
      })
      while (exists) {
        memberInviteCode = generateInviteCode()
        exists = await tx.organizationMember.findFirst({
          where: { inviteCode: memberInviteCode },
        })
      }

      // 添加为组织成员
      await tx.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId: auth.userId,
          role: 'MEMBER',
          inviterId: invite.inviterId,
          inviteCode: memberInviteCode,
        },
      })

      // 给邀请人发送通知
      await tx.notification.create({
        data: {
          userId: invite.inviterId,
          type: 'ORG_INVITE_ACCEPTED',
          title: '邀请已接受',
          content: `用户已接受你的邀请，加入组织【${invite.organization.name}】`,
          metadata: {
            organizationId: invite.organizationId,
            organizationName: invite.organization.name,
            acceptedUserId: auth.userId,
          },
        },
      })
    })

    return successResponse(null, '已加入组织')
  } catch (error) {
    console.error('接受邀请失败:', error)
    return serverErrorResponse('接受邀请失败')
  }
}
