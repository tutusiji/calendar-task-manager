import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate } from '@/lib/middleware'
import { successResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response'
import { checkRankUp } from '@/lib/utils/rank'

/**
 * POST /api/users/points
 * 增加用户积分
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth.authenticated || !auth.userId) {
      return auth.response
    }

    const body = await request.json()
    const { points, reason } = body

    if (typeof points !== 'number' || points <= 0) {
      return validationErrorResponse('积分必须是正整数')
    }

    // 获取用户当前积分
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { points: true, name: true },
    })

    if (!user) {
      return validationErrorResponse('用户不存在')
    }

    const oldPoints = user.points
    const newPoints = oldPoints + points

    // 更新用户积分
    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: { points: newPoints },
      select: {
        id: true,
        points: true,
      },
    })

    // 检查是否晋升段位
    const rankCheck = checkRankUp(oldPoints, newPoints)

    return successResponse({
      points: updatedUser.points,
      addedPoints: points,
      reason: reason || '积分增加',
      rankUp: rankCheck.hasRankUp
        ? {
            oldRank: rankCheck.oldRank.name,
            newRank: rankCheck.newRank.name,
          }
        : null,
    })
  } catch (error) {
    console.error('增加积分失败:', error)
    return serverErrorResponse('增加积分失败')
  }
}

/**
 * GET /api/users/points
 * 获取当前用户积分
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth.authenticated || !auth.userId) {
      return auth.response
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        points: true,
      },
    })

    if (!user) {
      return validationErrorResponse('用户不存在')
    }

    return successResponse({
      userId: user.id,
      name: user.name,
      points: user.points,
    })
  } catch (error) {
    console.error('获取积分失败:', error)
    return serverErrorResponse('获取积分失败')
  }
}
