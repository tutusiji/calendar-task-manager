import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { extractToken, verifyToken } from '@/lib/auth'
import type { ApiResponse } from '@/lib/api-response'
import {
  forbiddenResponse,
  unauthorizedResponse,
} from '@/lib/api-response'

import { verifyPanoramaToken } from './panorama-token'

export type GuardFailure = { error: NextResponse<ApiResponse> }

export interface OrgMemberContext {
  id: string
  role: string
}

/**
 * 校验请求携带的用户 JWT。
 * 只接受包含有效 userId 的普通用户令牌，超管面板令牌不能用于业务接口。
 */
export async function requireUser(
  request: NextRequest
): Promise<{ userId: string } | GuardFailure> {
  const token = extractToken(request.headers.get('Authorization'))
  if (!token) {
    return { error: unauthorizedResponse('未提供认证 Token') }
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return { error: unauthorizedResponse('Token 无效或已过期') }
  }

  return { userId: decoded.userId }
}

/**
 * 校验当前用户拥有超级管理员权限。
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ userId: string } | GuardFailure> {
  const auth = await requireUser(request)
  if ('error' in auth) return auth

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { isAdmin: true },
  })

  if (!user) {
    return { error: unauthorizedResponse('用户不存在') }
  }

  if (!user.isAdmin) {
    return { error: forbiddenResponse('需要超级管理员权限') }
  }

  return { userId: auth.userId }
}

/**
 * 校验用户属于指定组织。
 */
export async function requireOrgMember(
  userId: string,
  organizationId: string
): Promise<{ member: OrgMemberContext } | GuardFailure> {
  const member = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    select: {
      id: true,
      role: true,
    },
  })

  if (!member) {
    return { error: forbiddenResponse('您不是该组织成员') }
  }

  return { member }
}

/**
 * 校验内部超管面板访问权限。
 * 接受两种凭证：
 * 1. /api/admin/panorama/auth 签发的短期 panorama token
 * 2. 普通用户 JWT，且该用户 isAdmin = true
 */
export async function requirePanoramaAccess(
  request: NextRequest
): Promise<
  | { scope: 'panorama'; userId?: undefined }
  | { scope: 'admin'; userId: string }
  | GuardFailure
> {
  const token = extractToken(request.headers.get('Authorization'))
  if (!token) {
    return { error: unauthorizedResponse('未提供认证 Token') }
  }

  if (verifyPanoramaToken(token)) {
    return { scope: 'panorama' }
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return { error: unauthorizedResponse('Token 无效或已过期') }
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { isAdmin: true },
  })

  if (!user?.isAdmin) {
    return { error: forbiddenResponse('需要超级管理员权限') }
  }

  return { scope: 'admin', userId: decoded.userId }
}
