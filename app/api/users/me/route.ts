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
import {
  isValidEmail,
  sanitizeString
} from '@/lib/validation'

// GET /api/users/me - 获取当前用户信息
export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        gender: true,
        role: true,
        isAdmin: true,
        points: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return notFoundResponse('用户不存在')
    }

    return successResponse(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return serverErrorResponse('获取用户信息失败')
  }
}

// PUT /api/users/me - 更新当前用户信息
export async function PUT(request: NextRequest) {
  try {
    // 认证检查
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { name, email, avatar, gender, role } = body

    // 验证邮箱格式（如果提供）
    if (email && !isValidEmail(email)) {
      return validationErrorResponse('邮箱格式无效')
    }

    // 验证性别值（如果提供）
    const validGenders = ['未设置', '男', '女', '其他']
    if (gender && !validGenders.includes(gender)) {
      return validationErrorResponse('性别值无效')
    }

    // 验证职业值（如果提供）
    const validRoles = ['未设置', '设计师', '前端开发', '后端开发', '产品经理', '项目管理', '交互设计师']
    if (role && !validRoles.includes(role)) {
      return validationErrorResponse('职业值无效')
    }

    // 构建更新数据
    const updateData: any = {}
    if (name !== undefined) updateData.name = sanitizeString(name, 50)
    if (email !== undefined) updateData.email = email
    if (avatar !== undefined) updateData.avatar = avatar
    if (gender !== undefined) updateData.gender = gender
    if (role !== undefined) updateData.role = role

    // 更新用户信息
    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        gender: true,
        role: true,
        isAdmin: true,
        points: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return successResponse(user, '用户信息更新成功')
  } catch (error) {
    console.error('Error updating user:', error)
    return serverErrorResponse('更新用户信息失败')
  }
}
