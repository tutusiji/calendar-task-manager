import { NextResponse } from 'next/server'

/**
 * 获取运行时配置
 * 返回服务端环境变量，支持客户端动态获取配置
 */
export async function GET() {
  return NextResponse.json({
    avatarApiUrl: process.env.AVATAR_API_URL || 'https://api.dicebear.com'
  })
}
