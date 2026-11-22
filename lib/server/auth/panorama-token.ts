import jwt from 'jsonwebtoken'

import { getJwtSecret } from '@/lib/auth'

const PANORAMA_TOKEN_TTL = '8h'

/**
 * 签发内部超管面板的短期访问令牌。
 * 生命周期与普通用户 JWT 分离，避免把超管密码下发到客户端。
 */
export function generatePanoramaToken(): string {
  return jwt.sign({ scope: 'panorama' }, getJwtSecret(), {
    expiresIn: PANORAMA_TOKEN_TTL,
  })
}

export function verifyPanoramaToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, getJwtSecret())
    return (
      typeof decoded === 'object' &&
      decoded !== null &&
      (decoded as { scope?: unknown }).scope === 'panorama'
    )
  } catch {
    return false
  }
}
