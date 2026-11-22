import { NextRequest } from 'next/server'
import { verifyToken, extractToken } from './auth'
import { unauthorizedResponse } from './api-response'

/**
 * 认证中间件 - 从请求中提取并验证 JWT Token
 * @param request Next.js 请求对象
 * @returns 用户 ID 或错误响应
 */
export async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = extractToken(authHeader)

  if (!token) {
    return {
      error: unauthorizedResponse('未提供认证 Token')
    }
  }

  const decoded = verifyToken(token)

  if (!decoded) {
    return {
      error: unauthorizedResponse('Token 无效或已过期')
    }
  }

  return {
    userId: decoded.userId
  }
}

/**
 * 类型：认证结果
 */
export type AuthResult =
  | { userId: string; error?: never }
  | { userId?: never; error: ReturnType<typeof unauthorizedResponse> }
