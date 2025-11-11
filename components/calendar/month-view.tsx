"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { getMonthDays, isSameDay } from "@/lib/utils/date-utils"
import { CalendarDay } from "./calendar-day"
import { assignTaskTracks, type TaskWithTrack } from "@/lib/utils/task-layout"

export function MonthView() {
  const { currentDate, dragState, dragMoveState, tasks, selectedProjectIds, hideWeekends, updateDragMove, endDragMove, cancelDragMove } = useCalendarStore()
  const [expandedDate, setExpandedDate] = useState<Date | null>(null)
  const expandedRef = useRef<HTMLDivElement | null>(null)
  const [showPlaceholder, setShowPlaceholder] = useState(false)
  const placeholderTimerRef = useRef<NodeJS.Timeout | null>(null)

  const monthDays = getMonthDays(currentDate.getFullYear(), currentDate.getMonth(), hideWeekends)
  const today = new Date()

  const weekDays = hideWeekends 
    ? ["周一", "周二", "周三", "周四", "周五"]
    : ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

  // 全局鼠标事件处理（用于拖拽移动任务）
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragMoveState.isMoving) {
        endDragMove()
        setShowPlaceholder(false)
        if (placeholderTimerRef.current) {
          clearTimeout(placeholderTimerRef.current)
          placeholderTimerRef.current = null
        }
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [dragMoveState.isMoving, endDragMove])

  // 监听 dragMoveState 变化，实现防抖逻辑
  useEffect(() => {
    // 清除之前的定时器
    if (placeholderTimerRef.current) {
      clearTimeout(placeholderTimerRef.current)
      placeholderTimerRef.current = null
    }

    if (dragMoveState.isMoving && dragMoveState.offsetDays !== 0) {
      // 如果正在拖拽且有偏移，200ms 后显示占位条
      placeholderTimerRef.current = setTimeout(() => {
        setShowPlaceholder(true)
      }, 0)
    } else {
      // 如果停止拖拽或回到原位，立即隐藏占位条
      setShowPlaceholder(false)
    }

    return () => {
      if (placeholderTimerRef.current) {
        clearTimeout(placeholderTimerRef.current)
      }
    }
  }, [dragMoveState.isMoving, dragMoveState.offsetDays])

  // 根据选中的项目过滤任务
  const filteredTasks = useMemo(() => {
    // 如果没有选中任何项目，则不显示任何任务
    if (selectedProjectIds.length === 0) {
      return []
    }
    return tasks.filter(task => selectedProjectIds.includes(task.projectId))
  }, [tasks, selectedProjectIds])

  // 将日期按周分组
  const weeks = useMemo(() => {
    const result: Date[][] = []
    const daysPerWeek = hideWeekends ? 5 : 7
    for (let i = 0; i < monthDays.length; i += daysPerWeek) {
      result.push(monthDays.slice(i, i + daysPerWeek))
    }
    return result
  }, [monthDays, hideWeekends])

  // 为每周独立分配轨道
  const weeksWithTracks = useMemo(() => {
    return weeks.map(week => {
      // 获取该周内的所有任务（在该周有任何一天重叠的任务）
      const weekStart = new Date(week[0])
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(week[week.length - 1])
      weekEnd.setHours(23, 59, 59, 999)
      
      const weekTasks = filteredTasks.filter(task => {
        const taskStart = new Date(task.startDate)
        taskStart.setHours(0, 0, 0, 0)
        const taskEnd = new Date(task.endDate)
        taskEnd.setHours(23, 59, 59, 999)
        
        // 任务与该周有重叠
        return taskStart <= weekEnd && taskEnd >= weekStart
      })
      
      // 为该周的任务独立分配轨道
      const weekTasksWithTracks = assignTaskTracks(weekTasks)
      
      return {
        days: week,
        tasks: weekTasksWithTracks
      }
    })
  }, [weeks, filteredTasks])

  // 计算每周的最大轨道数（用于设置行高）
  const weekHeights = useMemo(() => {
    return weeksWithTracks.map(week => {
      let maxTrack = 0
      
      week.days.forEach(date => {
        // 获取该日期的所有任务
        const dateTasks = week.tasks.filter(task => {
          const taskStart = new Date(task.startDate)
          taskStart.setHours(0, 0, 0, 0)
          const taskEnd = new Date(task.endDate)
          taskEnd.setHours(0, 0, 0, 0)
          const currentDate = new Date(date)
          currentDate.setHours(0, 0, 0, 0)
          return currentDate.getTime() >= taskStart.getTime() && currentDate.getTime() <= taskEnd.getTime()
        })
        
        // 找出该日期任务的最大轨道
        if (dateTasks.length > 0) {
          const maxTaskTrack = Math.max(...dateTasks.map(t => t.track))
          maxTrack = Math.max(maxTrack, maxTaskTrack + 1)
        }
      })
      
      // 最小高度180px，每个轨道28px
      const TASK_HEIGHT = 28
      const BASE_HEIGHT = 180
      const calculatedHeight = Math.max(BASE_HEIGHT, 80 + maxTrack * TASK_HEIGHT)
      
      return calculatedHeight
    })
  }, [weeksWithTracks])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expandedDate && expandedRef.current && !expandedRef.current.contains(event.target as Node)) {
        setExpandedDate(null)
      }
    }

    if (expandedDate) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }
  }, [expandedDate])

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

  return (
    <div className="flex h-full flex-col">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {weekDays.map((day) => (
          <div
            key={day}
            className="border-r border-border px-4 py-3 text-center text-sm font-medium text-muted-foreground last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid - 按周分行 */}
      <div className="flex-1 overflow-auto">
        {weeksWithTracks.map((week, weekIndex) => (
          <div 
            key={weekIndex} 
            className="grid grid-cols-7"
            style={{ minHeight: `${weekHeights[weekIndex]}px` }}
          >
            {week.days.map((day, dayIndex) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              const isToday = isSameDay(day, today)
              const isExpanded = expandedDate && isSameDay(day, expandedDate)
              const isDragTarget = isInDragRange(day)

              return (
                <CalendarDay
                  key={`${weekIndex}-${dayIndex}`}
                  date={day}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  isExpanded={!!isExpanded}
                  isDragTarget={isDragTarget}
                  showPlaceholder={showPlaceholder}
                  onExpand={() => setExpandedDate(isExpanded ? null : day)}
                  expandedRef={isExpanded ? expandedRef : undefined}
                  tasksWithTracks={week.tasks}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
