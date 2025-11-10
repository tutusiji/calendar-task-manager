"use client"

import { useMemo, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useCalendarStore } from "@/lib/store/calendar-store"
import type { User } from "@/lib/types"
import { cn } from "@/lib/utils"
import { assignTaskTracks } from "@/lib/utils/task-layout"

interface TeamMemberRowProps {
  user: User
  weekDays: Date[]
}

export function TeamMemberRow({ user, weekDays }: TeamMemberRowProps) {
  const { tasks, openTaskEdit, startDragCreate, updateDragCreate, endDragCreate, openTaskCreation, dragState, selectedProjectIds } = useCalendarStore()
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null)

  // 根据选中的项目过滤任务
  const filteredTasks = useMemo(() => {
    // 如果没有选中任何项目，则不显示任何任务
    if (selectedProjectIds.length === 0) {
      return []
    }
    return tasks.filter(task => selectedProjectIds.includes(task.projectId))
  }, [tasks, selectedProjectIds])

  const userTasks = useMemo(() => filteredTasks.filter((task) => task.userId === user.id), [filteredTasks, user.id])

  // 为用户的任务分配轨道
  const userTasksWithTracks = useMemo(() => assignTaskTracks(userTasks), [userTasks])

  // 获取需要在指定日期渲染的任务
  const getTasksToRenderForDay = (date: Date, dayIndex: number) => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    
    return userTasksWithTracks.filter(task => {
      const taskStart = new Date(task.startDate)
      taskStart.setHours(0, 0, 0, 0)
      const taskEnd = new Date(task.endDate)
      taskEnd.setHours(0, 0, 0, 0)
      
      // 情况1：任务在当前日期开始
      if (taskStart.getTime() === currentDate.getTime()) {
        return true
      }
      
      // 情况2：这是本周第一天（周一），且任务在本周之前开始但还在继续
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
    
    // 获取该周内的所有任务
    const weekTasks = userTasksWithTracks.filter(task => {
      const taskStart = new Date(task.startDate)
      taskStart.setHours(0, 0, 0, 0)
      const taskEnd = new Date(task.endDate)
      taskEnd.setHours(23, 59, 59, 999)
      return taskStart <= weekEnd && taskEnd >= weekStart
    })
    
    if (weekTasks.length === 0) return 0
    return Math.max(...weekTasks.map(t => t.track)) + 1
  }, [userTasksWithTracks, weekDays])

  // 计算任务跨越的天数
  const calculateSpanDays = (task: typeof userTasksWithTracks[0], startDate: Date) => {
    const taskStart = new Date(task.startDate)
    taskStart.setHours(0, 0, 0, 0)
    const taskEnd = new Date(task.endDate)
    taskEnd.setHours(0, 0, 0, 0)
    const currentDate = new Date(startDate)
    currentDate.setHours(0, 0, 0, 0)
    
    // 找到当前日期在本周的位置
    const dayIndex = weekDays.findIndex(d => {
      const day = new Date(d)
      day.setHours(0, 0, 0, 0)
      return day.getTime() === currentDate.getTime()
    })
    
    if (dayIndex === -1) return 1
    
    // 计算从当前日期到任务结束日期的天数
    const diffTime = taskEnd.getTime() - currentDate.getTime()
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    
    // 但不能超过本周剩余的天数
    const remainingDaysInWeek = weekDays.length - dayIndex
    
    return Math.min(totalDays, remainingDaysInWeek)
  }

  const getTaskColor = (type: string) => {
    switch (type) {
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
    startDragCreate(date, { x: e.clientX, y: e.clientY })
  }

  // 处理鼠标进入（更新拖拽范围）
  const handleMouseEnter = (date: Date, dayIndex: number) => {
    setHoveredDayIndex(dayIndex)
    if (dragState.isCreating) {
      updateDragCreate(date)
    }
  }

  // 处理鼠标释放（结束拖拽，打开创建面板）
  const handleMouseUp = () => {
    if (dragState.isCreating) {
      const result = endDragCreate()
      if (result) {
        // 打开任务创建面板，注意：这里创建的任务应该自动分配给当前用户
        openTaskCreation(result.startDate, result.endDate)
      }
    }
  }

  // 处理任务点击（打开编辑面板）
  const handleTaskClick = (e: React.MouseEvent, task: typeof userTasksWithTracks[0]) => {
    e.stopPropagation()
    openTaskEdit(task)
  }

  const TASK_HEIGHT = 24
  const TASK_GAP = 4
  const rowHeight = Math.max(120, 60 + maxTrack * (TASK_HEIGHT + TASK_GAP))

  return (
    <div className="flex border-b border-border hover:bg-muted/30 transition-colors" style={{ minHeight: `${rowHeight}px` }}>
      {/* User info */}
      <div className="w-[120px] shrink-0 border-r border-border px-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium text-foreground text-center cursor-default truncate w-full">
                  {user.name}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{user.email}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Week days */}
      <div className="flex flex-1 relative">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksToRenderForDay(day, index)
          const isDragTarget = isInDragRange(day)

          return (
            <div 
              key={index} 
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
              {/* 渲染该日期开始的任务 */}
              {dayTasks.map((task) => {
                const spanDays = calculateSpanDays(task, day)
                const isStart = true // 因为只在开始日期渲染
                const taskStart = new Date(task.startDate)
                taskStart.setHours(0, 0, 0, 0)
                const taskEnd = new Date(task.endDate)
                taskEnd.setHours(0, 0, 0, 0)
                const currentDate = new Date(day)
                currentDate.setHours(0, 0, 0, 0)
                
                // 计算是否是任务结束
                const isEnd = taskEnd.getTime() === currentDate.getTime() || 
                             (taskEnd.getTime() > currentDate.getTime() && spanDays < (taskEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24) + 1)
                
                // 圆角逻辑
                let roundedClass = ""
                if (spanDays === 1) {
                  roundedClass = "rounded-full"
                } else {
                  // 检查是否在本周结束
                  const dayIndex = weekDays.findIndex(d => {
                    const day = new Date(d)
                    day.setHours(0, 0, 0, 0)
                    return day.getTime() === currentDate.getTime()
                  })
                  const endsInThisWeek = dayIndex + spanDays - 1 < weekDays.length && taskEnd.getTime() <= new Date(weekDays[dayIndex + spanDays - 1]).setHours(0, 0, 0, 0)
                  
                  if (endsInThisWeek) {
                    roundedClass = "rounded-full"
                  } else {
                    roundedClass = "rounded-l-full"
                  }
                }

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "task-bar absolute px-2 py-1 text-xs font-medium text-white transition-all hover:opacity-90 hover:shadow-md cursor-pointer",
                      getTaskColor(task.type),
                      roundedClass
                    )}
                    style={{
                      width: spanDays > 1 ? `calc(100% * ${spanDays} - 6px * ${spanDays - 1})` : '100%',
                      top: `${task.track * (TASK_HEIGHT + TASK_GAP) + 4}px`,
                      height: `${TASK_HEIGHT}px`,
                      zIndex: 10,
                    }}
                    title={task.title}
                    onClick={(e) => handleTaskClick(e, task)}
                  >
                    <div className="flex items-center gap-1 truncate">
                      {task.startTime && <span className="text-[10px] opacity-90">{task.startTime}</span>}
                      <span className="truncate">{task.title}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
