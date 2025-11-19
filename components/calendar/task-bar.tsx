"use client"

import type React from "react"

import { useCalendarStore } from "@/lib/store/calendar-store"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TaskBarProps {
  task: Task
  date: Date
  track: number
  showUserInfo?: boolean // 是否显示用户头像和名字
  isPersonalWeekView?: boolean // 是否是个人周视图
}

export function TaskBar({ task, date, track, showUserInfo = false, isPersonalWeekView = false }: TaskBarProps) {
  const { getProjectById, openTaskEdit, hideWeekends, startDragMove, dragMoveState, getUserById, taskBarSize } = useCalendarStore()
  const project = getProjectById(task.projectId)
  
  // 获取所有负责人
  const assignees = task.assignees || []
  const assigneeCount = assignees.length
  
  // 获取前三个负责人的用户信息
  const assigneeUsers = assignees.slice(0, 3).map(a => getUserById(a.userId)).filter(Boolean)
  
  // 如果没有负责人，使用创建者
  const fallbackUser = assigneeCount === 0 ? getUserById(task.creatorId) : null

  // 判断当前任务是否正在被拖拽
  const isBeingDragged = dragMoveState.isMoving && dragMoveState.task?.id === task.id

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只响应左键点击
    if (e.button !== 0) return
    
    e.stopPropagation()
    e.preventDefault()
    
    startDragMove(task, date)
  }

  // 计算两个日期之间的工作日天数（可选择是否跳过周末）
  const countDays = (startDate: Date, endDate: Date): number => {
    let count = 0
    const current = new Date(startDate)
    current.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)
    
    while (current <= end) {
      const dayOfWeek = current.getDay()
      // 如果隐藏周末，则跳过周六(6)和周日(0)
      if (!hideWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    return count
  }

  // 计算任务跨越的天数
  const calculateSpanDays = () => {
    const start = new Date(task.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(task.endDate)
    end.setHours(0, 0, 0, 0)
    return countDays(start, end)
  }

  // 计算当前段显示的天数（考虑周截断和周末隐藏）
  const calculateDisplayDays = () => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const endDate = new Date(task.endDate)
    endDate.setHours(0, 0, 0, 0)
    
    // 计算当前日期是周几（0=周日, 1=周一, ..., 6=周六）
    const currentDayOfWeek = currentDate.getDay()
    const dayOfWeek = currentDayOfWeek === 0 ? 7 : currentDayOfWeek // 转换为1-7，周日=7
    
    // 计算到本周末还有多少天（包括今天）
    // 如果隐藏周末，则到周五结束；否则到周日结束
    const weekEndDay = hideWeekends ? 5 : 7 // 周五=5, 周日=7
    let daysUntilWeekEnd: number
    
    if (hideWeekends) {
      // 隐藏周末时，只计算到周五
      if (dayOfWeek <= 5) {
        daysUntilWeekEnd = 6 - dayOfWeek // 到周五的天数（包括今天）
      } else {
        // 如果已经是周末（不应该出现），返回0
        daysUntilWeekEnd = 0
      }
    } else {
      daysUntilWeekEnd = 8 - dayOfWeek // 到周日的天数
    }
    
    // 计算任务实际还剩多少天（考虑周末隐藏）
    const remainingDays = countDays(currentDate, endDate)
    
    // 返回较小值：要么到周末，要么到任务结束
    return Math.min(daysUntilWeekEnd, remainingDays)
  }

  // 判断是否是任务的开始日期
  const isTaskStart = () => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const startDate = new Date(task.startDate)
    startDate.setHours(0, 0, 0, 0)
    return currentDate.getTime() === startDate.getTime()
  }

  // 判断当前段是否包含任务的结束日期
  const isSegmentEnd = () => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const endDate = new Date(task.endDate)
    endDate.setHours(0, 0, 0, 0)
    
    const displayDays = calculateDisplayDays()
    const lastDisplayDate = new Date(currentDate)
    lastDisplayDate.setDate(lastDisplayDate.getDate() + displayDays - 1)
    
    // 检查任务结束日期是否在当前段的显示范围内
    return endDate.getTime() >= currentDate.getTime() && endDate.getTime() <= lastDisplayDate.getTime()
  }

  // 判断是否在周末（周日）截断
  const isWeekEndCut = () => {
    const displayDays = calculateDisplayDays()
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const lastDisplayDate = new Date(currentDate)
    lastDisplayDate.setDate(lastDisplayDate.getDate() + displayDays - 1)
    
    // 如果最后显示日期是周日，且任务还没结束，则截断
    return lastDisplayDate.getDay() === 0 && !isSegmentEnd()
  }

  const spanDays = calculateDisplayDays()
  const taskStart = isTaskStart()
  const segmentEnd = isSegmentEnd()
  const weekEndCut = isWeekEndCut()

  // 获取圆角样式
  const getRoundedClass = () => {
    // 情况1：任务在当前段开始且结束 → 两端圆角
    if (taskStart && segmentEnd) {
      return "rounded-full"
    }
    
    // 情况2：任务开始段，但会被周末截断 → 左圆角
    if (taskStart && weekEndCut) {
      return "rounded-l-full"
    }
    
    // 情况3：任务结束段（从之前周继续，这一段包含结束日期） → 右圆角
    if (!taskStart && segmentEnd) {
      return "rounded-r-full"
    }
    
    // 情况4：任务中间段（既不是开始也不包含结束） → 无圆角
    if (!taskStart && !segmentEnd) {
      return ""
    }
    
    // 其他情况默认两端圆角
    return "rounded-full"
  }

  const getTaskColor = () => {
    switch (task.type) {
      case "daily":
        return "bg-blue-500"
      case "meeting":
        return "bg-yellow-500"
      case "vacation":
        return "bg-red-500"
      default:
        return "bg-blue-500"
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering calendar day's drag creation
    // 只有在不是拖拽状态时才打开编辑面板
    if (!isBeingDragged && !dragMoveState.isMoving) {
      openTaskEdit(task)
    }
  }

  const TASK_HEIGHT = taskBarSize === "compact" ? 24 : 30 // 任务条高度 (px): 紧凑型24px, 宽松型30px
  const TASK_GAP = 4 // 任务条间距 (px)
  
  // 根据 taskBarSize 动态设置样式
  const avatarSizeClass = taskBarSize === "compact" ? "h-4 w-4" : "h-[22px] w-[22px]"
  const textSizeClass = taskBarSize === "compact" ? "text-xs" : "text-sm"
  const avatarFallbackTextSize = taskBarSize === "compact" ? "text-[8px]" : "text-[10px]"

  // 获取用户名首字母
  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      className={cn(
        "task-bar group absolute px-1 font-medium text-white transition-all",
        textSizeClass,
        getTaskColor(),
        getRoundedClass(),
        // 拖拽样式
        isBeingDragged ? "shadow-[0_8px_30px_rgb(0,0,0,0.4)] cursor-move" : "cursor-move hover:opacity-90 hover:shadow-md",
        // 其他任务在拖拽时禁用交互
        !isBeingDragged && dragMoveState.isMoving && "pointer-events-none",
      )}
      style={{
        width: isPersonalWeekView 
          ? (spanDays > 1 ? `calc(100% * ${spanDays} - 7px * ${spanDays - 1})` : 'calc(100% - 15px)')
          : (spanDays > 1 ? `calc(100% * ${spanDays} + 18px * ${spanDays - 1})` : '100%'),
        top: `${track * (TASK_HEIGHT + TASK_GAP) + (isPersonalWeekView ? 4 : 0)}px`,
        height: `${TASK_HEIGHT}px`,
        zIndex: isBeingDragged ? 50 : 10,
      }}
    >
      <div className="taskbar flex items-center gap-1 truncate h-full">
        {showUserInfo && (
          <>
            {assigneeCount === 1 ? (
              // 单个负责人：显示头像和姓名
              assigneeUsers[0] && (
                <>
                  <Avatar className={cn(avatarSizeClass, "shrink-0 border border-white/30 bg-white")}>
                    <AvatarImage src={assigneeUsers[0].avatar} alt={assigneeUsers[0].name} />
                    <AvatarFallback className={cn("bg-white/20 text-white", avatarFallbackTextSize)}>
                      {getUserInitial(assigneeUsers[0].name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="shrink-0 font-semibold">{assigneeUsers[0].name}</span>
                  <span className="opacity-60">|</span>
                </>
              )
            ) : assigneeCount === 0 ? (
              // 没有负责人：显示创建者
              fallbackUser && (
                <>
                  <Avatar className={cn(avatarSizeClass, "shrink-0 border border-white/30 bg-white")}>
                    <AvatarImage src={fallbackUser.avatar} alt={fallbackUser.name} />
                    <AvatarFallback className={cn("bg-white/20 text-white", avatarFallbackTextSize)}>
                      {getUserInitial(fallbackUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="shrink-0 font-semibold">{fallbackUser.name}</span>
                  <span className="opacity-60">|</span>
                </>
              )
            ) : assigneeCount <= 3 ? (
              // 2-3个负责人：只显示头像
              <>
                <div className="flex items-center -space-x-1 shrink-0">
                  {assigneeUsers.map((user, index) => (
                    <Avatar key={user.id} className={cn(avatarSizeClass, "border border-white/30 bg-white")} style={{ zIndex: assigneeCount - index }}>
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className={cn("bg-white/20 text-white", avatarFallbackTextSize)}>
                        {getUserInitial(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="opacity-60">|</span>
              </>
            ) : (
              // 4个或更多负责人：显示前3个头像 + "等N人"
              <>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <div className="flex items-center -space-x-1">
                    {assigneeUsers.map((user, index) => (
                      <Avatar key={user.id} className={cn(avatarSizeClass, "border border-white/30 bg-white")} style={{ zIndex: 3 - index }}>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className={cn("bg-white/20 text-white", avatarFallbackTextSize)}>
                          {getUserInitial(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-xs font-semibold">等{assigneeCount}人</span>
                </div>
                <span className="opacity-60 -mr-0.5">|</span>
              </>
            )}
          </>
        )}
        {task.startTime && <span className={cn("text-[10px] opacity-90", !showUserInfo && "ml-1")}>{task.startTime}</span>}
        <span className={cn("truncate", !showUserInfo && !task.startTime && "ml-1")}>{task.title}</span>
      </div>
    </div>
  )
}
