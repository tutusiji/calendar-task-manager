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

// POST /api/organizations/[id]/invite - 邀请用户加入组织
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const { id: organizationId } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return validationErrorResponse('缺少用户ID')
    }

    // 检查组织是否存在
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { 
        id: true, 
        name: true,
        creatorId: true,
      },
    })

    if (!organization) {
      return notFoundResponse('组织不存在')
    }

    // 检查邀请人是否是组织创建者
    if (organization.creatorId !== auth.userId) {
      return forbiddenResponse('只有组织创建者可以邀请成员')
    }

    // 检查被邀请用户是否存在
    const invitedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true },
    })

    if (!invitedUser) {
      return notFoundResponse('用户不存在')
    }

    // 检查用户是否已经是组织成员
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
      },
    })

    if (existingMember) {
      return validationErrorResponse('该用户已经是组织成员')
    }

    // 检查是否已经有待处理的邀请
    const existingInvite = await prisma.organizationInvite.findFirst({
      where: {
        organizationId,
        invitedUserId: userId,
        status: 'PENDING',
      },
    })

    if (existingInvite) {
      return validationErrorResponse('已向该用户发送过邀请,请等待回复')
    }

    // 获取邀请人信息
    const inviter = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, username: true },
    })

    // 创建邀请记录
    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId,
        inviterId: auth.userId,
        invitedUserId: userId,
        status: 'PENDING',
      },
    })

    // 发送通知给被邀请用户
    await prisma.notification.create({
      data: {
        userId,
        type: 'ORG_INVITE_RECEIVED',
        title: '组织邀请',
        content: `${inviter?.name || inviter?.username || '某用户'}邀请你加入组织【${organization.name}】`,
        metadata: {
          inviteId: invite.id,
          organizationId,
          organizationName: organization.name,
          inviterId: auth.userId,
          inviterName: inviter?.name || inviter?.username,
        },
      },
    })

    return successResponse(invite, '邀请已发送')
  } catch (error) {
    console.error('邀请用户失败:', error)
    return serverErrorResponse('邀请用户失败')
  }
}
