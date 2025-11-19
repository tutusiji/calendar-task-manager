/**
 * 积分段位系统工具函数
 * 包含段位计算、星级计算等功能
 */

export interface RankInfo {
  name: string
  min: number
  color: string // 段位对应的颜色
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'star' | 'king' // 段位档次
}

// 段位配置表
export const RANKS: RankInfo[] = [
  { name: '倔强青铜Ⅲ', min: 0, color: '#CD7F32', tier: 'bronze' },
  { name: '倔强青铜Ⅱ', min: 20, color: '#CD7F32', tier: 'bronze' },
  { name: '倔强青铜Ⅰ', min: 40, color: '#CD7F32', tier: 'bronze' },
  { name: '秩序白银Ⅲ', min: 60, color: '#C0C0C0', tier: 'silver' },
  { name: '秩序白银Ⅱ', min: 80, color: '#C0C0C0', tier: 'silver' },
  { name: '秩序白银Ⅰ', min: 100, color: '#C0C0C0', tier: 'silver' },
  { name: '荣耀黄金Ⅳ', min: 120, color: '#FFD700', tier: 'gold' },
  { name: '荣耀黄金Ⅲ', min: 150, color: '#FFD700', tier: 'gold' },
  { name: '荣耀黄金Ⅱ', min: 180, color: '#FFD700', tier: 'gold' },
  { name: '荣耀黄金Ⅰ', min: 210, color: '#FFD700', tier: 'gold' },
  { name: '尊贵铂金Ⅳ', min: 240, color: '#E5E4E2', tier: 'platinum' },
  { name: '尊贵铂金Ⅲ', min: 280, color: '#E5E4E2', tier: 'platinum' },
  { name: '尊贵铂金Ⅱ', min: 320, color: '#E5E4E2', tier: 'platinum' },
  { name: '尊贵铂金Ⅰ', min: 360, color: '#E5E4E2', tier: 'platinum' },
  { name: '永恒钻石Ⅴ', min: 400, color: '#B9F2FF', tier: 'diamond' },
  { name: '永恒钻石Ⅳ', min: 450, color: '#B9F2FF', tier: 'diamond' },
  { name: '永恒钻石Ⅲ', min: 500, color: '#B9F2FF', tier: 'diamond' },
  { name: '永恒钻石Ⅱ', min: 550, color: '#B9F2FF', tier: 'diamond' },
  { name: '永恒钻石Ⅰ', min: 600, color: '#B9F2FF', tier: 'diamond' },
  { name: '至尊星耀Ⅴ', min: 650, color: '#FF6B9D', tier: 'star' },
  { name: '至尊星耀Ⅳ', min: 710, color: '#FF6B9D', tier: 'star' },
  { name: '至尊星耀Ⅲ', min: 770, color: '#FF6B9D', tier: 'star' },
  { name: '至尊星耀Ⅱ', min: 830, color: '#FF6B9D', tier: 'star' },
  { name: '至尊星耀Ⅰ', min: 890, color: '#FF6B9D', tier: 'star' },
  { name: '最强王者', min: 950, color: '#FF0080', tier: 'king' },
  { name: '至圣王者', min: 1025, color: '#FF0080', tier: 'king' },
  { name: '无双王者', min: 1100, color: '#FF0080', tier: 'king' },
  { name: '非凡王者', min: 1175, color: '#FF0080', tier: 'king' },
  { name: '绝世王者', min: 1250, color: '#FF0080', tier: 'king' },
  { name: '荣耀王者', min: 1325, color: '#FF0080', tier: 'king' },
  { name: '传奇王者', min: 1500, color: '#FF0080', tier: 'king' },
]

/**
 * 根据积分获取段位信息
 */
export function getRank(score: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].min) {
      return RANKS[i]
    }
  }
  return RANKS[0]
}

/**
 * 获取下一段位信息
 */
export function getNextRank(score: number): RankInfo | null {
  const currentRank = getRank(score)
  const currentIndex = RANKS.findIndex((r) => r.name === currentRank.name)
  
  if (currentIndex < RANKS.length - 1) {
    return RANKS[currentIndex + 1]
  }
  
  return null // 已经是最高段位
}

/**
 * 计算距离下一段位还需要的积分
 */
export function getPointsToNextRank(score: number): number | null {
  const nextRank = getNextRank(score)
  if (!nextRank) return null
  return nextRank.min - score
}

/**
 * 计算王者段位的星级
 * 最强王者 (950-1024): 0-9 星
 * 至圣王者 (1025-1099): 10-19 星
 * 无双王者 (1100-1174): 20-29 星
 * 非凡王者 (1175-1249): 30-39 星
 * 绝世王者 (1250-1324): 40-49 星
 * 荣耀王者 (1325-1499): 50-99 星
 * 传奇王者 (1500+): ≥100 星
 */
export function getKingStars(score: number): number | null {
  if (score < 950) return null // 不是王者段位
  
  // 计算总星数（每 75 分 = 10 星）
  const totalStars = Math.floor((score - 950) / 7.5)
  return totalStars
}

/**
 * 获取当前段位内的星级（王者段位专用）
 * 例如：至圣王者有 10-19 星，如果总星数是 15，则返回 15
 */
export function getCurrentRankStars(score: number): number | null {
  if (score < 950) return null
  return getKingStars(score)
}

/**
 * 获取段位进度百分比（当前段位内的进度）
 */
export function getRankProgress(score: number): number {
  const currentRank = getRank(score)
  const nextRank = getNextRank(score)
  
  if (!nextRank) {
    // 已是最高段位
    return 100
  }
  
  const currentMin = currentRank.min
  const nextMin = nextRank.min
  const progress = ((score - currentMin) / (nextMin - currentMin)) * 100
  
  return Math.min(Math.max(progress, 0), 100)
}

/**
 * 行为积分配置
 */
export const POINT_ACTIONS = {
  CREATE_TASK: 2,
  CREATE_TEAM: 5,
  CREATE_PROJECT: 5,
  INVITE_USER: 10, // 邀请用户成功注册并激活
} as const

/**
 * 检查积分增加后是否晋升段位
 */
export function checkRankUp(oldScore: number, newScore: number): {
  hasRankUp: boolean
  oldRank: RankInfo
  newRank: RankInfo
} {
  const oldRank = getRank(oldScore)
  const newRank = getRank(newScore)
  
  return {
    hasRankUp: oldRank.name !== newRank.name,
    oldRank,
    newRank,
  }
}
