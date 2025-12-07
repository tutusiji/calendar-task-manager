"use client"

import { useMemo, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useCalendarStore } from "@/lib/store/calendar-store"
import type { User } from "@/lib/types"
import { cn } from "@/lib/utils"
import { assignTaskTracks } from "@/lib/utils/task-layout"
import { TaskBar } from "./task-bar"

interface TeamMemberRowProps {
  user: User
  weekDays: Date[]
  showPlaceholder: boolean
}

export function TeamMemberRow({ user, weekDays, showPlaceholder }: TeamMemberRowProps) {
  const { tasks, openTaskEdit, startDragCreate, updateDragCreate, endDragCreate, openTaskCreation, dragState, selectedProjectIds, dragMoveState, updateDragMove, startDragMove, taskBarSize } = useCalendarStore()
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null)

  // 根据选中的项目过滤任务
  const filteredTasks = useMemo(() => {
    // 如果没有选中任何项目，则显示所有任务（因为后端已经根据团队过滤了）
    if (selectedProjectIds.length === 0) {
      return tasks
    }
    return tasks.filter(task => selectedProjectIds.includes(task.projectId))
  }, [tasks, selectedProjectIds])

  // 只显示该用户作为负责人的任务(不包括仅作为创建人的任务)
  const userTasks = useMemo(() => 
    filteredTasks.filter((task) => 
      task.assignees?.some(a => a.userId === user.id)
    ), 
    [filteredTasks, user.id]
  )

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



  // 判断日期是否在拖拽范围内
  const isInDragRange = (date: Date) => {
    if (!dragState.isCreating || !dragState.startDate || !dragState.endDate) return false
    
    // 团队视图中，只有当拖拽的用户ID匹配当前用户时才高亮
    if (dragState.userId && dragState.userId !== user.id) return false

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
    startDragCreate(date, { x: e.clientX, y: e.clientY }, user.id)
  }

  // 处理鼠标进入（更新拖拽范围）
  const handleMouseEnter = (date: Date, dayIndex: number) => {
    setHoveredDayIndex(dayIndex)
    // 只有当拖拽的用户ID匹配当前用户时才更新拖拽范围
    if (dragState.isCreating && (!dragState.userId || dragState.userId === user.id)) {
      updateDragCreate(date)
    }
    // 处理拖拽移动任务时的鼠标移动
    if (dragMoveState.isMoving) {
      updateDragMove(date)
    }
  }

  // 处理鼠标释放（结束拖拽，打开创建面板）
  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragState.isCreating && dragState.userId === user.id) {
      e.stopPropagation() // 阻止事件冒泡到全局处理器
      const result = endDragCreate()
      if (result) {
        // 打开任务创建面板，传入当前用户的ID
        openTaskCreation(result.startDate, result.endDate, user.id)
      }
    }
  }



  const TASK_HEIGHT = taskBarSize === "compact" ? 24 : 30 // 紧凑型24px, 宽松型30px
  const TASK_GAP = 4
  const rowHeight = Math.max(120, 60 + maxTrack * (TASK_HEIGHT + TASK_GAP))

  return (
    <div className="flex border-b border-border hover:bg-muted/30 transition-colors" style={{ minHeight: `${rowHeight}px` }}>
      {/* User info */}
      <div className="w-[120px] shrink-0 border-r border-border px-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <Avatar className="h-[70px] w-[70px]">
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
                return (
                  <TaskBar 
                    key={task.id} 
                    task={task} 
                    date={day} 
                    track={task.track} 
                    isPersonalWeekView={true} 
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
