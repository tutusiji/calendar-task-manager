"use client"

import { useState, useMemo } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { TaskBar } from "./task-bar"
import { cn } from "@/lib/utils"
import { getMaxTrackForDate, type TaskWithTrack } from "@/lib/utils/task-layout"

interface CalendarDayProps {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isExpanded: boolean
  isDragTarget: boolean
  showPlaceholder: boolean
  onExpand: () => void
  expandedRef?: React.RefObject<HTMLDivElement | null>
  tasksWithTracks: TaskWithTrack[]
}

export function CalendarDay({
  date,
  isCurrentMonth,
  isToday,
  isExpanded,
  isDragTarget,
  showPlaceholder,
  onExpand,
  expandedRef,
  tasksWithTracks: allTasksWithTracks,
}: CalendarDayProps) {
  const { startDragCreate, updateDragCreate, endDragCreate, dragState, openTaskCreation, dragMoveState, updateDragMove } =
    useCalendarStore()
  const [isHovering, setIsHovering] = useState(false)

  // 过滤出与当前日期相关的任务
  const currentDateTasks = useMemo(() => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const currentTime = currentDate.getTime()
    
    return allTasksWithTracks.filter(task => {
      const taskStart = new Date(task.startDate)
      taskStart.setHours(0, 0, 0, 0)
      const taskEnd = new Date(task.endDate)
      taskEnd.setHours(0, 0, 0, 0)
      
      // 任务在当前日期范围内
      return currentTime >= taskStart.getTime() && currentTime <= taskEnd.getTime()
    })
  }, [allTasksWithTracks, date])
  
  // 获取需要在当前日期渲染的任务（任务开始日期 或 周一且任务跨周继续）
  const tasks = useMemo(() => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const currentDayOfWeek = currentDate.getDay() // 0=周日, 1=周一, ..., 6=周六
    const isMonday = currentDayOfWeek === 1
    
    return currentDateTasks.filter(task => {
      const taskStartDate = new Date(task.startDate)
      taskStartDate.setHours(0, 0, 0, 0)
      const taskEndDate = new Date(task.endDate)
      taskEndDate.setHours(0, 0, 0, 0)
      
      // 情况1：任务在当前日期开始
      const isTaskStart = taskStartDate.getTime() === currentDate.getTime()
      
      // 情况2：当前是周一，且任务在本周之前就已经开始，但还没结束（跨周继续的中间段）
      const isWeeklyContinuation = isMonday && 
        taskStartDate.getTime() < currentDate.getTime() &&
        taskEndDate.getTime() >= currentDate.getTime()
      
      return isTaskStart || isWeeklyContinuation
    })
  }, [currentDateTasks, date])
  
  const visibleTasks = tasks // 显示所有任务，不再限制数量
  const hasMoreTasks = false // 不再需要"更多"按钮
  
  // 计算当前日期的最大轨道数（用于设置容器高度）
  const maxTrack = useMemo(() => {
    return getMaxTrackForDate(currentDateTasks)
  }, [currentDateTasks])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent drag creation when clicking on task bars or buttons
    if ((e.target as HTMLElement).closest(".task-bar")) return
    if ((e.target as HTMLElement).closest("button")) return

    e.preventDefault()
    startDragCreate(date, { x: e.clientX, y: e.clientY })
  }

  const handleMouseEnter = () => {
    setIsHovering(true)
    if (dragState.isCreating) {
      updateDragCreate(date)
    }
    // 处理拖拽移动任务时的鼠标移动
    if (dragMoveState.isMoving) {
      updateDragMove(date)
    }
  }

  const handleMouseUp = () => {
    if (dragState.isCreating) {
      const result = endDragCreate()
      if (result) {
        openTaskCreation(result.startDate, result.endDate)
      }
    }
  }

  return (
    <div
      ref={isExpanded ? expandedRef : undefined}
      className={cn(
        "relative border-b border-r border-border p-2 transition-all last:border-r-0 select-none overflow-visible h-full",
        !isCurrentMonth && "bg-muted/20",
        isToday && "bg-blue-50/50",
        isExpanded && "col-span-2 row-span-2 z-10 shadow-lg bg-card",
        isDragTarget && "bg-blue-100/50 ring-2 ring-blue-500 ring-inset",
        isHovering && !isDragTarget && "bg-muted/30",
      )}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovering(false)}
      onMouseUp={handleMouseUp}
    >
      {/* Date number */}
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
            isToday && "bg-primary text-primary-foreground",
            !isToday && isCurrentMonth && "text-foreground",
            !isToday && !isCurrentMonth && "text-muted-foreground",
          )}
        >
          {date.getDate()}
        </span>
      </div>

      {/* Tasks */}
      <div 
        className="relative overflow-visible"
      >
        {visibleTasks.map((task) => (
          <TaskBar key={task.id} task={task} date={date} track={task.track} />
        ))}
        
        {/* 拖拽占位预览 */}
        {showPlaceholder && dragMoveState.isMoving && dragMoveState.task && dragMoveState.startDate && (() => {
          // 计算目标日期
          const targetDate = new Date(dragMoveState.startDate)
          targetDate.setDate(targetDate.getDate() + dragMoveState.offsetDays)
          targetDate.setHours(0, 0, 0, 0)
          
          const currentDate = new Date(date)
          currentDate.setHours(0, 0, 0, 0)
          
          const task = dragMoveState.task
          const taskStart = new Date(task.startDate)
          taskStart.setHours(0, 0, 0, 0)
          const taskEnd = new Date(task.endDate)
          taskEnd.setHours(0, 0, 0, 0)
          
          // 计算目标范围
          const targetStart = new Date(targetDate)
          const daysDiff = Math.floor((taskEnd.getTime() - taskStart.getTime()) / (24 * 60 * 60 * 1000))
          const targetEnd = new Date(targetStart)
          targetEnd.setDate(targetEnd.getDate() + daysDiff)
          
          // 检查当前日期是否在目标范围内
          if (currentDate.getTime() >= targetStart.getTime() && currentDate.getTime() <= targetEnd.getTime()) {
            // 找到对应的 taskWithTrack 来获取 track 信息
            const taskWithTrack = allTasksWithTracks.find(t => t.id === task.id)
            const track = taskWithTrack?.track || 0
            
            // 计算任务在当前日期的显示位置和宽度
            const isStartDate = currentDate.getTime() === targetStart.getTime()
            const spanDays = Math.min(
              Math.floor((targetEnd.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000)) + 1,
              7 // 最多跨7天
            )
            
            return (
              <div
                className="absolute left-0 right-0 rounded-md border-2 border-dashed border-blue-500 bg-blue-100/30 pointer-events-none"
                style={{
                  height: '28px',
                  top: `${track * 36}px`,
                  width: `calc(${spanDays * 100}% + ${(spanDays - 1) * 18}px)`,
                  zIndex: 40,
                }}
              >
                {isStartDate && (
                  <div className="h-full flex items-center px-2 text-xs text-blue-600 font-medium truncate">
                    {task.title}
                  </div>
                )}
              </div>
            )
          }
          return null
        })()}
      </div>

      {isDragTarget && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="h-6 rounded-full bg-blue-500/30 border-2 border-blue-500 w-[90%]" />
        </div>
      )}
    </div>
  )
}
