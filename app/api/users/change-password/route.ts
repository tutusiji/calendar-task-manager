import { NextRequest } from 'next/server'
import { authenticate } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse
} from '@/lib/api-response'

/**
 * PUT /api/users/change-password
 * 修改当前用户密码
 */
export async function PUT(request: NextRequest) {
  try {
    // 认证检查
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    // 解析请求体
    const body = await request.json()
    const { oldPassword, newPassword } = body

    // 验证必填字段
    if (!oldPassword || !newPassword) {
      return validationErrorResponse('原密码和新密码不能为空')
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return validationErrorResponse('新密码长度至少为6位')
    }

    // 验证新密码不能与旧密码相同
    if (oldPassword === newPassword) {
      return validationErrorResponse('新密码不能与原密码相同')
    }

    // 获取用户完整信息（包括密码）
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        password: true,
      },
    })

    if (!user) {
      return validationErrorResponse('用户不存在')
    }

    // 验证原密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password)
    if (!isPasswordValid) {
      return validationErrorResponse('原密码错误')
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    return successResponse(null, '密码修改成功')
  } catch (error) {
    console.error('Change password error:', error)
    return serverErrorResponse('修改密码失败')
  }
}
