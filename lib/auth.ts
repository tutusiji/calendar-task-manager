import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const DEV_FALLBACK_SECRET = 'dev-only-secret-do-not-use-in-production'
const JWT_EXPIRES_IN = '90d' // Token 有效期 90 天

/**
 * 获取 JWT 签名密钥。
 * 生产环境必须显式配置 JWT_SECRET，缺失时直接失败，避免使用可预测的默认密钥。
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production')
  }

  return DEV_FALLBACK_SECRET
}

/**
 * 密码哈希
 * @param password 原始密码
 * @returns 哈希后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

/**
 * 验证密码
 * @param password 用户输入的密码
 * @param hashedPassword 数据库中存储的哈希密码
 * @returns 密码是否匹配
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * 生成 JWT Token
 * @param payload Token 载荷（通常包含用户 ID）
 * @returns JWT Token 字符串
 */
export function generateToken(payload: { userId: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN })
}

/**
 * 验证 JWT Token
 * @param token JWT Token 字符串
 * @returns 解码后的载荷，验证失败返回 null
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret())

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof (decoded as { userId?: unknown }).userId !== 'string' ||
      !(decoded as { userId: string }).userId
    ) {
      return null
    }

    return { userId: (decoded as { userId: string }).userId }
  } catch {
    return null
  }
}

/**
 * 从请求头提取 Token
 * @param authorizationHeader Authorization 请求头值
 * @returns Token 字符串，不存在返回 null
 */
export function extractToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null
  
  // 支持两种格式：
  // 1. Bearer <token>
  // 2. <token>
  const parts = authorizationHeader.split(' ')
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1]
  }
  
  return authorizationHeader
}
