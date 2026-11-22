import { timingSafeEqual } from 'crypto'

import type { NextRequest } from 'next/server'

import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response'
import { generatePanoramaToken } from '@/lib/server/auth/panorama-token'
import {
  checkRateLimit,
  getClientIp,
  rateLimitExceededResponse,
} from '@/lib/server/security/rate-limit'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_ATTEMPTS = 5

function safeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  if (aBuffer.length !== bBuffer.length) {
    return false
  }

  return timingSafeEqual(aBuffer, bBuffer)
}

/**
 * POST /api/admin/panorama/auth
 * 校验服务端配置的超管密码，成功后签发短期 panorama token。
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(
    `panorama-auth:${ip}`,
    RATE_LIMIT_MAX_ATTEMPTS,
    RATE_LIMIT_WINDOW_MS
  )

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfterSeconds)
  }

  const expectedPassword = process.env.PANORAMA_ADMIN_PASSWORD
  if (!expectedPassword) {
    return errorResponse('超管面板未配置访问密码', 503)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('请求格式错误', 400)
  }

  const password =
    typeof body === 'object' && body !== null && 'password' in body
      ? (body as { password?: unknown }).password
      : undefined

  if (typeof password !== 'string' || !password) {
    return errorResponse('请输入超管密码', 400)
  }

  if (!safeEqual(password, expectedPassword)) {
    return unauthorizedResponse('超管密码错误')
  }

  return successResponse({
    token: generatePanoramaToken(),
    expiresIn: 8 * 60 * 60,
  })
}
