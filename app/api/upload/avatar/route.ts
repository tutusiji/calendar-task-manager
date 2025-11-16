import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { authenticate } from '@/lib/middleware'
import {
  successResponse,
  validationErrorResponse,
  serverErrorResponse
} from '@/lib/api-response'

// Next.js 16+ App Router 使用新的配置方式
export const maxDuration = 30 // 最大执行时间 30 秒
export const dynamic = 'force-dynamic' // 强制动态渲染

// POST /api/upload/avatar - 上传头像
export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const auth = await authenticate(request)
    if (auth.error) return auth.error

    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return validationErrorResponse('请选择要上传的文件')
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return validationErrorResponse('只支持 JPG、PNG、GIF 和 WebP 格式的图片')
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return validationErrorResponse('图片大小不能超过 5MB')
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const ext = path.extname(file.name)
    const filename = `avatar-${auth.userId}-${timestamp}-${randomStr}${ext}`

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (error) {
      // 目录可能已存在，忽略错误
    }

    // 保存文件
    const buffer = Buffer.from(await file.arrayBuffer())
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // 返回文件 URL
    const avatarUrl = `/uploads/avatars/${filename}`

    return successResponse({
      url: avatarUrl,
      filename,
      size: file.size,
      type: file.type
    }, '头像上传成功', 201)
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return serverErrorResponse('上传头像失败')
  }
}
