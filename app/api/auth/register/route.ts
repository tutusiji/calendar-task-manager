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
    const { username, password, name, email, avatar } = body

    // 验证必填字段
    const requiredValidation = validateRequiredFields(body, [
      'username',
      'password',
      'name',
      'email'
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

    // 创建新用户
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(), // 统一转为小写
        password: hashedPassword,
        name: cleanName,
        email: cleanEmail,
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true
      }
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
