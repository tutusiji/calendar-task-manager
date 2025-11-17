import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// JWT 密钥（生产环境应从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const JWT_EXPIRES_IN = '90d' // Token 有效期 90 天

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * 验证 JWT Token
 * @param token JWT Token 字符串
 * @returns 解码后的载荷，验证失败返回 null
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded
  } catch (error) {
    // 添加详细的错误日志
    console.error('Token 验证失败:', {
      error: error instanceof Error ? error.message : error,
      tokenLength: token?.length,
      tokenPrefix: token?.substring(0, 20) + '...'
    })
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
