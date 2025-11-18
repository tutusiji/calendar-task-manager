import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  serverErrorResponse
} from '@/lib/api-response'
import {
  validateRequiredFields,
  isValidEmail,
  isValidUsername,
  validatePassword,
  sanitizeString
} from '@/lib/validation'
import { randomBytes } from 'crypto'

// 生成短邀请码（8位）
function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

// POST /api/auth/register - 用户注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, name, email, avatar, role, organization, organizationId, inviteCode } = body

    // 验证必填字段
    const requiredValidation = validateRequiredFields(body, [
      'username',
      'password',
      'name',
      'email',
      'role',
      'organization'
    ])
    if (!requiredValidation.valid) {
      return validationErrorResponse(requiredValidation.message!)
    }

    // 验证用户名格式
    if (!isValidUsername(username)) {
      return validationErrorResponse(
        '用户名格式无效：长度 3-20 个字符，只能包含字母、数字、下划线、连字符，且必须以字母或数字开头'
      )
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      return validationErrorResponse('邮箱格式无效')
    }

    // 验证密码强度
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return validationErrorResponse(passwordValidation.message!)
    }

    // 验证职业
    const validRoles = ['设计师', '前端开发', '后端开发', '产品经理', '项目管理', '交互设计师']
    if (!validRoles.includes(role)) {
      return validationErrorResponse('请选择有效的职业')
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return errorResponse('该用户名已被注册', 409)
    }

    // 如果选择了已有组织，验证邀请码
    let inviterId: string | null = null
    if (organizationId && inviteCode) {
      // 查找该组织中拥有该邀请码的成员
      const member = await prisma.organizationMember.findFirst({
        where: {
          inviteCode,
          organizationId
        },
        select: {
          userId: true
        }
      })

      if (!member) {
        return errorResponse('邀请码无效或不属于此组织', 400)
      }

      inviterId = member.userId
    }

    // 清理输入数据
    const cleanName = sanitizeString(name, 100)
    const cleanEmail = sanitizeString(email, 100)
    const cleanOrganization = sanitizeString(organization, 100)

    // 哈希密码
    const hashedPassword = await hashPassword(password)

    // 创建新用户、组织和个人项目（使用事务）
    const result = await prisma.$transaction(async (tx: any) => {
      // 创建用户（不再需要 User.inviteCode）
      const newUser = await tx.user.create({
        data: {
          username: username.toLowerCase(), // 统一转为小写
          password: hashedPassword,
          name: cleanName,
          email: cleanEmail,
          role: role, // 职业
          avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
          createdAt: true
        }
      })

      // 处理组织
      let orgId = organizationId
      let notificationData: { inviterId?: string; organizationId?: string } = {}
      
      if (organizationId && inviterId) {
        // 用户通过邀请码加入已有组织，直接成为成员
        // 为新成员生成唯一的邀请码
        let memberInviteCode = generateInviteCode()
        let exists = await tx.organizationMember.findFirst({ where: { inviteCode: memberInviteCode } })
        while (exists) {
          memberInviteCode = generateInviteCode()
          exists = await tx.organizationMember.findFirst({ where: { inviteCode: memberInviteCode } })
        }
        
        await tx.organizationMember.create({
          data: {
            userId: newUser.id,
            organizationId: organizationId,
            role: 'MEMBER',
            inviterId: inviterId, // 记录邀请人
            inviteCode: memberInviteCode // 生成该成员在该组织的邀请码
          }
        })

        // 设置当前组织
        await tx.user.update({
          where: { id: newUser.id },
          data: { currentOrganizationId: organizationId }
        })

        // 创建个人项目
        await tx.project.create({
          data: {
            name: `${cleanName}的个人事务`,
            color: '#3b82f6',
            description: '个人日常任务和事项',
            organizationId: organizationId,
            creatorId: newUser.id,
            members: {
              create: {
                userId: newUser.id
              }
            }
          }
        })

        // 发送站内信给邀请人
        await tx.notification.create({
          data: {
            userId: inviterId,
            type: 'USER_INVITED_JOINED',
            title: '新成员加入',
            content: `${cleanName} 通过您的邀请码 ${inviteCode} 加入了组织`,
            metadata: {
              newUserId: newUser.id,
              newUserName: cleanName,
              organizationId: organizationId,
              inviteCode: inviteCode
            }
          }
        })

        notificationData = { inviterId, organizationId }
      } else if (organizationId && !inviterId) {
        // 用户选择了已有组织但没有邀请码，创建加入申请
        const org = await tx.organization.findUnique({
          where: { id: organizationId },
          select: { creatorId: true }
        })

        await tx.organizationJoinRequest.create({
          data: {
            organizationId: organizationId,
            applicantId: newUser.id,
            status: 'PENDING'
          }
        })

        // 发送站内信给组织创建人
        if (org) {
          await tx.notification.create({
            data: {
              userId: org.creatorId,
              type: 'ORG_JOIN_REQUEST',
              title: '新的加入申请',
              content: `${cleanName} 申请加入您的组织`,
              metadata: {
                applicantId: newUser.id,
                applicantName: cleanName,
                organizationId: organizationId
              }
            }
          })
        }

        notificationData = { organizationId }
        // 不设置 currentOrganizationId，等待审批
      } else {
        // 用户输入了新组织名称，创建新组织
        // 为创始人生成唯一的邀请码
        let memberInviteCode = generateInviteCode()
        let exists = await tx.organizationMember.findFirst({ where: { inviteCode: memberInviteCode } })
        while (exists) {
          memberInviteCode = generateInviteCode()
          exists = await tx.organizationMember.findFirst({ where: { inviteCode: memberInviteCode } })
        }
        
        const newOrg = await tx.organization.create({
          data: {
            name: cleanOrganization,
            creatorId: newUser.id,
            isVerified: false,
            members: {
              create: {
                userId: newUser.id,
                role: 'OWNER',
                inviteCode: memberInviteCode // 为创始人生成邀请码
              }
            }
          }
        })
        orgId = newOrg.id

        // 设置用户的当前组织
        await tx.user.update({
          where: { id: newUser.id },
          data: { currentOrganizationId: orgId }
        })

        // 为新用户创建专属的"个人事务"项目
        await tx.project.create({
          data: {
            name: `${cleanName}的个人事务`,
            color: '#3b82f6',
            description: '个人日常任务和事项',
            organizationId: orgId,
            creatorId: newUser.id,
            members: {
              create: {
                userId: newUser.id
              }
            }
          }
        })
      }

      return { 
        ...newUser, 
        currentOrganizationId: orgId,
        ...notificationData
      }
    })

    // 生成 JWT Token
    const token = generateToken({ userId: result.id })

    return successResponse(
      {
        user: {
          id: result.id,
          username: result.username,
          name: result.name,
          email: result.email,
          avatar: result.avatar,
          role: result.role,
          createdAt: result.createdAt,
          currentOrganizationId: result.currentOrganizationId
        },
        token
      },
      '注册成功',
      201
    )
  } catch (error) {
    console.error('Error registering user:', error)
    return serverErrorResponse('注册失败，请稍后重试')
  }
}
