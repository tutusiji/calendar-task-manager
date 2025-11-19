"use client"

import { useEffect, useMemo, useState } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { getWeekDays, getWeekDayName } from "@/lib/utils/date-utils"
import { assignTaskTracks } from "@/lib/utils/task-layout"
import { TaskBar } from "./task-bar"
import { cn } from "@/lib/utils"

export function PersonalWeekView() {
  const { currentDate, currentUser, tasks, selectedProjectIds, hideWeekends, dragState, dragMoveState, cancelDragCreate, endDragMove, taskBarSize, startDragCreate, updateDragCreate, endDragCreate, openTaskCreation, updateDragMove, startDragMove } = useCalendarStore()
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null)

  const weekDays = getWeekDays(currentDate, hideWeekends)

  // 全局 mouseup 事件处理
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState.isCreating) {
        cancelDragCreate()
      }
      if (dragMoveState.isMoving) {
        endDragMove()
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [dragState.isCreating, dragMoveState.isMoving, cancelDragCreate, endDragMove])

  // 过滤当前用户的任务
  const userTasks = useMemo(() => {
    // 如果 currentUser 为空，返回空数组
    if (!currentUser) return []
    
    const filtered = selectedProjectIds.length === 0 
      ? tasks 
      : tasks.filter(task => selectedProjectIds.includes(task.projectId))
    
    return filtered.filter(task => 
      task.assignees?.some(a => a.userId === currentUser.id) || 
      task.creatorId === currentUser.id
    )
  }, [tasks, selectedProjectIds, currentUser])

  // 为任务分配轨道
  const tasksWithTracks = useMemo(() => assignTaskTracks(userTasks), [userTasks])

  // 获取需要在指定日期渲染的任务
  const getTasksToRenderForDay = (date: Date, dayIndex: number) => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    
    return tasksWithTracks.filter(task => {
      const taskStart = new Date(task.startDate)
      taskStart.setHours(0, 0, 0, 0)
      const taskEnd = new Date(task.endDate)
      taskEnd.setHours(0, 0, 0, 0)
      
      // 任务在当前日期开始
      if (taskStart.getTime() === currentDate.getTime()) {
        return true
      }
      
      // 这是本周第一天,且任务在本周之前开始但还在继续
      const weekStart = new Date(weekDays[0])
      weekStart.setHours(0, 0, 0, 0)
      
      if (dayIndex === 0 && taskStart.getTime() < weekStart.getTime() && taskEnd.getTime() >= currentDate.getTime()) {
        return true
      }
      
      return false
    })
  }

  // 计算该周的最大轨道数
  const maxTrack = useMemo(() => {
    const weekStart = new Date(weekDays[0])
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekDays[weekDays.length - 1])
    weekEnd.setHours(23, 59, 59, 999)
    
    const weekTasks = tasksWithTracks.filter(task => {
      const taskStart = new Date(task.startDate)
      taskStart.setHours(0, 0, 0, 0)
      const taskEnd = new Date(task.endDate)
      taskEnd.setHours(23, 59, 59, 999)
      return taskStart <= weekEnd && taskEnd >= weekStart
    })
    
    if (weekTasks.length === 0) return 0
    return Math.max(...weekTasks.map(t => t.track)) + 1
  }, [tasksWithTracks, weekDays])

  const TASK_HEIGHT = taskBarSize === "compact" ? 24 : 30 // 紧凑型24px, 宽松型30px
  const TASK_GAP = 4

  // 判断日期是否在拖拽范围内
  const isInDragRange = (date: Date) => {
    if (!dragState.isCreating || !dragState.startDate || !dragState.endDate) return false
    
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    const start = new Date(dragState.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(dragState.endDate)
    end.setHours(0, 0, 0, 0)

    return checkDate >= start && checkDate <= end
  }

  // 处理鼠标按下（开始拖拽创建）
  const handleMouseDown = (e: React.MouseEvent, date: Date) => {
    // 阻止在任务条上拖拽
    if ((e.target as HTMLElement).closest(".task-bar")) return
    
    e.preventDefault()
    startDragCreate(date, { x: e.clientX, y: e.clientY }, currentUser?.id)
  }

  // 处理鼠标进入（更新拖拽范围）
  const handleMouseEnter = (date: Date, dayIndex: number) => {
    setHoveredDayIndex(dayIndex)
    if (dragState.isCreating) {
      updateDragCreate(date)
    }
    // 处理拖拽移动任务时的鼠标移动
    if (dragMoveState.isMoving) {
      updateDragMove(date)
    }
  }

  // 处理鼠标释放（结束拖拽，打开创建面板）
  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragState.isCreating) {
      e.stopPropagation() // 阻止事件冒泡到全局处理器
      const result = endDragCreate()
      if (result && currentUser) {
        // 打开任务创建面板，传入当前用户的ID
        openTaskCreation(result.startDate, result.endDate, currentUser.id)
      }
    }
  }

  return (
    <div className="flex h-full flex-col" key={`personal-week-${hideWeekends ? 'workdays' : 'fullweek'}`}>
      {/* Week day headers */}
      <div className="flex border-b border-border bg-muted/30">
        {weekDays.map((day, index) => (
          <div key={`day-${index}-${hideWeekends ? '5' : '7'}`} className="flex-1 border-r border-border px-4 py-3 text-center last:border-r-0">
            <div className="text-xs text-muted-foreground">{getWeekDayName(day.getDay())}</div>
            <div className="mt-1 text-sm font-medium text-foreground">{day.getDate()}</div>
          </div>
        ))}
      </div>

      {/* Single row for current user's tasks - 撑满剩余空间 */}
      <div className="flex flex-1 border-b border-border hover:bg-muted/30 transition-colors">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksToRenderForDay(day, index)
          const isDragTarget = isInDragRange(day)

          return (
            <div 
              key={`task-day-${index}-${hideWeekends ? '5' : '7'}`}
              className={cn(
                "flex-1 border-r border-border p-2 last:border-r-0 relative select-none transition-colors",
                isDragTarget && "bg-blue-100/50 ring-2 ring-blue-500 ring-inset",
                hoveredDayIndex === index && !isDragTarget && "bg-muted/50"
              )}
              onMouseDown={(e) => handleMouseDown(e, day)}
              onMouseEnter={() => handleMouseEnter(day, index)}
              onMouseLeave={() => setHoveredDayIndex(null)}
              onMouseUp={handleMouseUp}
            >
              {dayTasks.map((task) => (
                <TaskBar key={task.id} task={task} date={day} track={task.track} isPersonalWeekView={true} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
