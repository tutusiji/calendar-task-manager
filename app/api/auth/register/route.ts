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

// POST /api/auth/register - 用户注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, name, email, avatar, role } = body

    // 验证必填字段
    const requiredValidation = validateRequiredFields(body, [
      'username',
      'password',
      'name',
      'email',
      'role'
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

    // 清理输入数据
    const cleanName = sanitizeString(name, 100)
    const cleanEmail = sanitizeString(email, 100)

    // 哈希密码
    const hashedPassword = await hashPassword(password)

    // 创建新用户和个人项目（使用事务）
    const user = await prisma.$transaction(async (tx: any) => {
      // 创建用户
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

      // 为新用户创建专属的"个人事务"项目
      await tx.project.create({
        data: {
          name: `${cleanName}的个人事务`,
          color: '#3b82f6',
          description: '个人日常任务和事项',
          creatorId: newUser.id,
          members: {
            create: {
              userId: newUser.id
            }
          }
        }
      })

      return newUser
    })

    // 生成 JWT Token
    const token = generateToken({ userId: user.id })

    return successResponse(
      {
        user,
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
