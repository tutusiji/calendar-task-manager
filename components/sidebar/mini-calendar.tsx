"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCalendarState } from "@/lib/store/use-calendar-state"
import {
  formatDate,
  getMonthDays,
  getMonthName,
  isSameDay,
} from "@/lib/utils/date-utils"
import { cn } from "@/lib/utils"

const MINI_CALENDAR_COLLAPSED_KEY = "mini-calendar-collapsed"

function readCollapsedState(): boolean {
  if (typeof window === "undefined") return false

  try {
    return window.localStorage.getItem(MINI_CALENDAR_COLLAPSED_KEY) === "true"
  } catch {
    return false
  }
}

function writeCollapsedState(collapsed: boolean): void {
  try {
    window.localStorage.setItem(
      MINI_CALENDAR_COLLAPSED_KEY,
      String(collapsed)
    )
  } catch {
    // localStorage 不可用时仅保留内存状态
  }
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function MiniCalendar() {
  const { tasks, setCurrentDate, currentDate, miniCalendarDate: miniDate, setMiniCalendarDate } =
    useCalendarState("tasks", "setCurrentDate", "currentDate", "miniCalendarDate", "setMiniCalendarDate")
  const [isCollapsed, setIsCollapsed] = useState(readCollapsedState)
  const today = new Date()

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      writeCollapsedState(next)
      return next
    })
  }

  const monthDays = useMemo(
    () => getMonthDays(miniDate.getFullYear(), miniDate.getMonth()),
    [miniDate]
  )

  // 预计算当前月份每一天的任务数量，避免 42 天 × 全量任务反复扫描
  const taskCountsByDay = useMemo(() => {
    const counts = new Map<string, number>()
    const monthStart = new Date(miniDate.getFullYear(), miniDate.getMonth(), 1)
    const monthEnd = new Date(miniDate.getFullYear(), miniDate.getMonth() + 1, 0)

    for (const task of tasks) {
      const taskStart = startOfLocalDay(new Date(task.startDate))
      const taskEnd = startOfLocalDay(new Date(task.endDate))

      const startTime = Math.max(taskStart.getTime(), monthStart.getTime())
      const endTime = Math.min(taskEnd.getTime(), monthEnd.getTime())
      if (startTime > endTime) continue

      const cursor = new Date(startTime)
      const endDate = new Date(endTime)

      while (cursor <= endDate) {
        const key = formatDate(cursor)
        counts.set(key, (counts.get(key) || 0) + 1)
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    return counts
  }, [tasks, miniDate])

  const goToPreviousMonth = () => {
    setMiniCalendarDate(new Date(miniDate.getFullYear(), miniDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setMiniCalendarDate(new Date(miniDate.getFullYear(), miniDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentDate(now)
  }

  const handleDateClick = (date: Date) => {
    setCurrentDate(
      new Date(date.getFullYear(), date.getMonth(), date.getDate())
    )
  }

  const weekDays = ["一", "二", "三", "四", "五", "六", "日"]

  return (
    <div className={cn("bg-card", isCollapsed ? "px-4 py-3" : "p-4")}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between",
          !isCollapsed && "mb-3"
        )}
      >
        <h3 className="text-sm font-semibold text-foreground">
          {getMonthName(miniDate.getMonth())} {miniDate.getFullYear()}
        </h3>
        <div className="flex items-center gap-1">
          {!isCollapsed && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-xs font-medium"
                onClick={goToToday}
                title="返回今天"
                aria-label="返回今天"
              >
                今
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={goToPreviousMonth}
                aria-label="上个月"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={goToNextMonth}
                aria-label="下个月"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? "展开迷你日历" : "折叠迷你日历"}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? "展开日历" : "折叠日历"}
          >
            {isCollapsed ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Week day headers */}
          <div className="mb-2 grid grid-cols-7 gap-1">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const isCurrentMonth = day.getMonth() === miniDate.getMonth()
              const isToday = isSameDay(day, today)
              const isSelected =
                isCurrentMonth && isSameDay(day, currentDate)
              const taskCount = isCurrentMonth
                ? taskCountsByDay.get(formatDate(day)) || 0
                : 0

              return (
                <button
                  key={formatDate(day)}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  aria-label={`${day.getMonth() + 1}月${day.getDate()}日${
                    taskCount > 0 ? `，${taskCount} 个事项` : ""
                  }`}
                  aria-current={isToday ? "date" : undefined}
                  title={taskCount > 0 ? `${taskCount} 个事项` : undefined}
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-md text-xs transition-colors",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isCurrentMonth && "text-foreground hover:bg-muted",
                    isSelected &&
                      !isToday &&
                      "font-semibold text-primary ring-1 ring-primary/60",
                    isToday &&
                      "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {day.getDate()}
                  {taskCount > 0 && isCurrentMonth && !isToday && (
                    <div className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-500" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
