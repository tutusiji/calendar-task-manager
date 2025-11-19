import { prisma } from '@/lib/prisma'
import { checkRankUp, POINT_ACTIONS } from '@/lib/utils/rank'

/**
 * 增加用户积分的工具函数
 * @param userId 用户ID
 * @param points 积分数量
 * @param reason 原因描述
 * @returns 是否晋升段位以及段位信息
 */
export async function addUserPoints(
  userId: string,
  points: number,
  reason: string
): Promise<{
  success: boolean
  oldPoints: number
  newPoints: number
  hasRankUp: boolean
  oldRank?: string
  newRank?: string
}> {
  try {
    // 获取用户当前积分
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    })

    if (!user) {
      return {
        success: false,
        oldPoints: 0,
        newPoints: 0,
        hasRankUp: false,
      }
    }

    const oldPoints = user.points
    const newPoints = oldPoints + points

    // 更新用户积分
    await prisma.user.update({
      where: { id: userId },
      data: { points: newPoints },
    })

    // 检查是否晋升段位
    const rankCheck = checkRankUp(oldPoints, newPoints)

    console.log(`[积分系统] ${reason}: 用户 ${userId} 获得 ${points} 积分，从 ${oldPoints} 升至 ${newPoints}${rankCheck.hasRankUp ? `，晋升至 ${rankCheck.newRank.name}` : ''}`)

    return {
      success: true,
      oldPoints,
      newPoints,
      hasRankUp: rankCheck.hasRankUp,
      oldRank: rankCheck.oldRank.name,
      newRank: rankCheck.newRank.name,
    }
  } catch (error) {
    console.error('增加积分失败:', error)
    return {
      success: false,
      oldPoints: 0,
      newPoints: 0,
      hasRankUp: false,
    }
  }
}

/**
 * 快捷方法：创建任务获得积分
 */
export async function addPointsForTaskCreation(userId: string) {
  return addUserPoints(userId, POINT_ACTIONS.CREATE_TASK, '创建任务')
}

/**
 * 快捷方法：创建团队获得积分
 */
export async function addPointsForTeamCreation(userId: string) {
  return addUserPoints(userId, POINT_ACTIONS.CREATE_TEAM, '创建团队')
}

/**
 * 快捷方法：创建项目获得积分
 */
export async function addPointsForProjectCreation(userId: string) {
  return addUserPoints(userId, POINT_ACTIONS.CREATE_PROJECT, '创建项目')
}

/**
 * 快捷方法：邀请用户成功获得积分
 */
export async function addPointsForUserInvitation(inviterId: string, invitedUserName: string) {
  return addUserPoints(inviterId, POINT_ACTIONS.INVITE_USER, `邀请用户 ${invitedUserName} 成功`)
}
