import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * 进程内滑动窗口限流。
 *
 * 适用于单实例部署的基础防护；多实例/Serverless 部署时应替换为 Redis 等共享存储。
 */
interface RateLimitBucket {
  timestamps: number[]
}

const buckets = new Map<string, RateLimitBucket>()
const MAX_BUCKETS = 10_000

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const cutoff = now - windowMs

  const bucket = buckets.get(key) ?? { timestamps: [] }
  const timestamps = bucket.timestamps.filter((time) => time > cutoff)

  if (timestamps.length >= limit) {
    const oldest = timestamps[0] ?? now
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    )
    buckets.set(key, { timestamps })
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  timestamps.push(now)
  buckets.set(key, { timestamps })

  // 机会式清理过期 key，避免长期运行后 Map 无限增长
  if (buckets.size > MAX_BUCKETS) {
    for (const [bucketKey, value] of buckets) {
      if (!value.timestamps.some((time) => time > cutoff)) {
        buckets.delete(bucketKey)
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - timestamps.length),
    retryAfterSeconds: 0,
  }
}

export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  return (
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    'unknown'
  )
}

export function rateLimitExceededResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: '请求过于频繁，请稍后再试',
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }
  )
}
