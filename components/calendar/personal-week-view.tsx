"use client"

import { useEffect, useMemo } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { getWeekDays, getWeekDayName } from "@/lib/utils/date-utils"
import { assignTaskTracks } from "@/lib/utils/task-layout"
import { TaskBar } from "./task-bar"

export function PersonalWeekView() {
  const { currentDate, currentUser, tasks, selectedProjectIds, hideWeekends, dragState, dragMoveState, cancelDragCreate, endDragMove } = useCalendarStore()

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
    const filtered = selectedProjectIds.length === 0 
      ? tasks 
      : tasks.filter(task => selectedProjectIds.includes(task.projectId))
    
    return filtered.filter(task => task.userId === currentUser.id)
  }, [tasks, selectedProjectIds, currentUser.id])

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

  const TASK_HEIGHT = 24
  const TASK_GAP = 4
  const rowHeight = Math.max(120, 60 + maxTrack * (TASK_HEIGHT + TASK_GAP))

  return (
    <div className="flex h-full flex-col">
      {/* Week day headers */}
      <div className="flex border-b border-border bg-muted/30">
        {weekDays.map((day, index) => (
          <div key={index} className="flex-1 border-r border-border px-4 py-3 text-center last:border-r-0">
            <div className="text-xs text-muted-foreground">{getWeekDayName(day.getDay())}</div>
            <div className="mt-1 text-sm font-medium text-foreground">{day.getDate()}</div>
          </div>
        ))}
      </div>

      {/* Single row for current user's tasks */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex border-b border-border hover:bg-muted/30 transition-colors" style={{ minHeight: `${rowHeight}px` }}>
          {weekDays.map((day, index) => {
            const dayTasks = getTasksToRenderForDay(day, index)

            return (
              <div 
                key={index} 
                className="flex-1 border-r border-border p-2 last:border-r-0 relative select-none"
              >
                {dayTasks.map((task) => (
                  <TaskBar key={task.id} task={task} date={day} track={task.track} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
