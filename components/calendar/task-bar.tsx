"use client"

import React, { useState } from "react"

import { useCalendarStore } from "@/lib/store/calendar-store"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProgressCircle } from "../task/progress-circle"
import { TASK_COLORS } from "@/lib/types"

interface TaskBarProps {
  task: Task
  date: Date
  track: number
  showUserInfo?: boolean // 是否显示用户头像和名字
  isPersonalWeekView?: boolean // 是否是个人周视图
}

export function TaskBar({ task, date, track, showUserInfo = false, isPersonalWeekView = false }: TaskBarProps) {
  const { getProjectById, openTaskEdit, hideWeekends, startDragMove, dragMoveState, getUserById, taskBarSize, updateTask } = useCalendarStore()
  const [isHovered, setIsHovered] = useState(false)
  const [isProgressDragging, setIsProgressDragging] = useState(false)
  const [dragProgress, setDragProgress] = useState(task.progress || 0)
  const [optimisticProgress, setOptimisticProgress] = useState<number | null>(null)
  const taskBarRef = React.useRef<HTMLDivElement>(null)
  
  const project = getProjectById(task.projectId)

  // 监听 task.progress 变化，如果与乐观状态一致，则清除乐观状态
  React.useEffect(() => {
    if (optimisticProgress !== null && task.progress === optimisticProgress) {
      setOptimisticProgress(null)
    }
  }, [task.progress, optimisticProgress])
  
  // 获取所有负责人
  const assignees = task.assignees || []
  const assigneeCount = assignees.length
  
  // 获取前三个负责人的用户信息
  const assigneeUsers = assignees.slice(0, 3).map(a => getUserById(a.userId)).filter((u): u is import("@/lib/types").User => !!u)
  
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
    // 如果是日常任务且有自定义颜色，使用镂空样式
    if (task.type === 'daily' && task.color) {
      const colorConfig = TASK_COLORS.find(c => c.value === task.color)
      if (colorConfig) {
        return `${colorConfig.border} ${colorConfig.lightBg} ${colorConfig.text} border`
      }
    }
    
    // 默认颜色
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

  const getTaskHexColor = () => {
    if (task.type === 'daily' && task.color) {
      const colorConfig = TASK_COLORS.find(c => c.value === task.color)
      return colorConfig ? colorConfig.hex : '#3b82f6'
    }
    switch (task.type) {
      case "daily": return '#3b82f6'
      case "meeting": return '#eab308'
      case "vacation": return '#ef4444'
      default: return '#3b82f6'
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering calendar day's drag creation
    // 只有在不是拖拽状态时才打开编辑面板
    if (!isBeingDragged && !dragMoveState.isMoving && !isProgressDragging) {
      openTaskEdit(task)
    }
  }

  // 处理进度条拖拽
  const handleProgressMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    setIsProgressDragging(true)
    setDragProgress(task.progress || 0)
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (taskBarRef.current) {
        const rect = taskBarRef.current.getBoundingClientRect()
        const x = moveEvent.clientX - rect.left
        let newProgress = Math.round((x / rect.width) * 100)
        
        // Clamp between 0 and 100
        newProgress = Math.max(0, Math.min(100, newProgress))
        setDragProgress(newProgress)
      }
    }
    
    const handleMouseUp = () => {
      setIsProgressDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      
      // 提交更新
      if (taskBarRef.current) {
        // 使用最新的 dragProgress 值，这里需要通过 ref 或者重新计算，
        // 但由于闭包问题，直接使用 setDragProgress 的回调或者 ref 更安全。
        // 简单起见，我们在 mouseUp 时再计算一次或者利用 state 更新机制。
        // 这里为了确保准确，我们重新计算一次最终值
        // 实际上，由于闭包，这里的 dragProgress 可能不是最新的。
        // 更好的方式是使用 ref 存储当前的 dragProgress
      }
    }
    
    // 重新定义 mouseUp 以获取正确的 progress
    const handleMouseUpWithSave = async (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUpWithSave)
      
      if (taskBarRef.current) {
        const rect = taskBarRef.current.getBoundingClientRect()
        const x = upEvent.clientX - rect.left
        let finalProgress = Math.round((x / rect.width) * 100)
        finalProgress = Math.max(0, Math.min(100, finalProgress))
        
        // 如果进度没有变化，直接退出
        if (finalProgress === (task.progress || 0)) {
          setIsProgressDragging(false)
          return
        }

        // 先设置乐观状态，防止回弹
        setOptimisticProgress(finalProgress)
        // 然后再结束拖拽状态
        setIsProgressDragging(false)
        
        try {
          await updateTask(task.id, { progress: finalProgress })
        } catch (error) {
          console.error("Failed to update progress:", error)
          // 如果失败，清除乐观状态，回滚到 store 中的值
          setOptimisticProgress(null)
        } 
        // 注意：不要在 finally 中清除 optimisticProgress，
        // 而是通过 useEffect 监听 task.progress 的变化来清除，
        // 这样可以避免在 store 更新前出现回弹
      } else {
        setIsProgressDragging(false)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUpWithSave)
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

  // 计算显示的进度值
  const displayProgress = isProgressDragging 
    ? dragProgress 
    : (optimisticProgress !== null ? optimisticProgress : (task.progress || 0))

  return (
    <div
      ref={taskBarRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "task-bar group absolute px-1 font-medium text-white transition-all overflow-hidden",
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
      {/* 进度背景填充 - 拖拽时禁用过渡效果以提高响应速度 */}
      <div 
        className={cn(
          "absolute left-0 top-0 h-full opacity-30",
          !isProgressDragging && "transition-all duration-300"
        )}
        style={{
          width: `${displayProgress}%`,
          backgroundColor: getTaskHexColor(),
        }}
      />

      {/* 进度拖拽手柄 - 始终渲染，使用 CSS group-hover 控制显示，解决 React 状态丢失问题 */}
      <div
        className={cn(
          "absolute top-0 bottom-0 z-30 w-4 -ml-2 cursor-ew-resize flex items-center justify-center group/handle transition-opacity duration-200",
          // 默认隐藏且不响应事件
          "opacity-0 pointer-events-none",
          // Hover 或 拖拽时显示并响应事件
          "group-hover:opacity-100 group-hover:pointer-events-auto",
          isProgressDragging && "opacity-100 pointer-events-auto"
        )}
        style={{ left: `${displayProgress}%` }}
        onMouseDown={handleProgressMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 视觉标记：两条竖线 */}
        <div className="flex gap-0.5 h-3/5 opacity-80 group-hover/handle:opacity-100">
          <div className="w-px h-full bg-black shadow-sm animate-pulse" />
          <div className="w-px h-full bg-black shadow-sm animate-pulse delay-75" />
        </div>
        {/* 显示当前进度百分比提示 */}
        {isProgressDragging && (
          <div className="absolute bottom-full mb-1 px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded">
            {dragProgress}%
          </div>
        )}
      </div>

      <div className="taskbar flex items-center gap-1 truncate h-full relative z-10">
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
                <div className="flex items-center gap-1 shrink-0">
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
        <span className={cn("truncate flex-1", !showUserInfo && !task.startTime && "ml-1")}>{task.title}</span>
        
        {/* Progress Circle - Only for daily tasks */}
        {task.type === 'daily' && (
          <div className="shrink-0 ml-auto flex items-center">
            <ProgressCircle 
              progress={displayProgress} 
              color={task.color}
              size={taskBarSize === "compact" ? 20 : 24}
              showNumber={isHovered || isProgressDragging}
            />
          </div>
        )}
      </div>
    </div>
  )
}
