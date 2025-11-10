"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { getMonthDays, isSameDay } from "@/lib/utils/date-utils"
import { CalendarDay } from "./calendar-day"
import { assignTaskTracks, type TaskWithTrack } from "@/lib/utils/task-layout"

export function MonthView() {
  const { currentDate, dragState, tasks } = useCalendarStore()
  const [expandedDate, setExpandedDate] = useState<Date | null>(null)
  const expandedRef = useRef<HTMLDivElement | null>(null)

  const monthDays = getMonthDays(currentDate.getFullYear(), currentDate.getMonth())
  const today = new Date()

  const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

  // 将日期按周分组
  const weeks = useMemo(() => {
    const result: Date[][] = []
    for (let i = 0; i < monthDays.length; i += 7) {
      result.push(monthDays.slice(i, i + 7))
    }
    return result
  }, [monthDays])

  // 为每周独立分配轨道
  const weeksWithTracks = useMemo(() => {
    return weeks.map(week => {
      // 获取该周内的所有任务（在该周有任何一天重叠的任务）
      const weekStart = new Date(week[0])
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(week[6])
      weekEnd.setHours(23, 59, 59, 999)
      
      const weekTasks = tasks.filter(task => {
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
  }, [weeks, tasks])

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
