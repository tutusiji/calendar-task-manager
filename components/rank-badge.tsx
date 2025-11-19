"use client"

import { Trophy, Star, TrendingUp, HelpCircle } from "lucide-react"
import { getRank, getKingStars, getRankProgress, getNextRank, getPointsToNextRank } from "@/lib/utils/rank"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from "react"

interface RankBadgeProps {
  points: number
  variant?: 'full' | 'compact' | 'minimal' // 显示模式
  showProgress?: boolean // 是否显示进度条
  clickable?: boolean // 是否可点击（minimal模式下有效）
}

export function RankBadge({ points, variant = 'full', showProgress = true, clickable = true }: RankBadgeProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const rank = getRank(points)
  const stars = getKingStars(points)
  const progress = getRankProgress(points)
  const nextRank = getNextRank(points)
  const pointsToNext = getPointsToNextRank(points)
  
  // 积分规则说明组件
  const PointsRulesTooltip = () => (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold text-sm">积分获取规则</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span>创建任务</span>
                <span className="font-medium text-green-500">+2 积分</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>创建团队</span>
                <span className="font-medium text-green-500">+5 积分</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>创建项目</span>
                <span className="font-medium text-green-500">+5 积分</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>邀请用户</span>
                <span className="font-medium text-green-500">+10 积分</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              积分越多，段位越高！
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  // 完整信息展示内容
  const FullRankDisplay = () => (
    <div className="space-y-3">
      {/* 段位头部 */}
      <div className="flex items-center gap-3">
        {getTierIcon()}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg" style={{ color: rank.color }}>
              {rank.name}
            </h3>
            {stars !== null && (
              <Badge variant="secondary">
                ⭐ {stars} 星
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            当前积分: {points}
          </p>
        </div>
        <PointsRulesTooltip />
      </div>
      
      {/* 进度条 */}
      {showProgress && nextRank && pointsToNext !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>下一段位: {nextRank.name}</span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              还需 {pointsToNext} 积分
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-right">
            {progress.toFixed(1)}%
          </div>
        </div>
      )}
      
      {/* 已达最高段位 */}
      {!nextRank && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span className="bg-linear-to-r from-yellow-600 to-red-600 bg-clip-text text-transparent">
            已达最高段位！
          </span>
        </div>
      )}
    </div>
  )
  
  // 根据段位档次选择图标颜色
  const getTierIcon = () => {
    switch (rank.tier) {
      case 'bronze':
        return <Trophy className="h-5 w-5" style={{ color: '#CD7F32' }} />
      case 'silver':
        return <Trophy className="h-5 w-5" style={{ color: '#C0C0C0' }} />
      case 'gold':
        return <Trophy className="h-5 w-5" style={{ color: '#FFD700' }} />
      case 'platinum':
        return <Trophy className="h-5 w-5" style={{ color: '#E5E4E2' }} />
      case 'diamond':
        return <Trophy className="h-5 w-5" style={{ color: '#B9F2FF' }} />
      case 'star':
        return <Star className="h-5 w-5" style={{ color: '#FF6B9D' }} fill="#FF6B9D" />
      case 'king':
        return <Trophy className="h-5 w-5" style={{ color: '#FF0080' }} />
      default:
        return <Trophy className="h-5 w-5" />
    }
  }
  
  // 最小模式：只显示图标和段位名
  if (variant === 'minimal') {
    const minimalContent = (
      <div className={`flex items-center gap-2 ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}>
        {getTierIcon()}
        <span className="text-sm font-semibold" style={{ color: rank.color }}>
          {rank.name}
        </span>
        {stars !== null && (
          <Badge variant="secondary" className="text-xs">
            ⭐ {stars} 星
          </Badge>
        )}
      </div>
    )
    
    // 如果可点击，包裹在 Popover 中
    if (clickable) {
      return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            {minimalContent}
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <FullRankDisplay />
          </PopoverContent>
        </Popover>
      )
    }
    
    return minimalContent
  }
  
  // 紧凑模式：显示图标、段位、积分
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
        {getTierIcon()}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base" style={{ color: rank.color }}>
              {rank.name}
            </span>
            {stars !== null && (
              <Badge variant="secondary" className="text-xs">
                ⭐ {stars} 星
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">
            {points} 积分
          </div>
        </div>
      </div>
    )
  }
  
  // 完整模式：显示所有信息包括进度条
  return <FullRankDisplay />
}
