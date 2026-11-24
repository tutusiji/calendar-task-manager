"use client"

import { useId, useMemo, useState } from "react"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCalendarState } from "@/lib/store/use-calendar-state"
import {
  formatDate,
  getMonthDays,
  isSameDay,
} from "@/lib/utils/date-utils"
import { cn } from "@/lib/utils"
import { sidebarFocus } from "./sidebar-navigation"

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

export function MiniCalendar({ onNavigate }: { onNavigate?: () => void }) {
  const { tasks, setCurrentDate, currentDate, miniCalendarDate: miniDate, setMiniCalendarDate } =
    useCalendarState("tasks", "setCurrentDate", "currentDate", "miniCalendarDate", "setMiniCalendarDate")
  const [isCollapsed, setIsCollapsed] = useState(readCollapsedState)
  const calendarGridId = useId()
  const monthLabel = `${miniDate.getFullYear()}年${miniDate.getMonth() + 1}月`
  const today = new Date()

  const toggleCollapsed = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    writeCollapsedState(next)
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
    onNavigate?.()
  }

  const handleDateClick = (date: Date) => {
    setCurrentDate(
      new Date(date.getFullYear(), date.getMonth(), date.getDate())
    )
    onNavigate?.()
  }

  const weekDays = ["一", "二", "三", "四", "五", "六", "日"]

  return (
    <section aria-label="迷你日历" className="shrink-0 border-t border-sidebar-border">
      <div className="flex items-center">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={`${isCollapsed ? "展开" : "折叠"}迷你日历，${monthLabel}`}
          aria-expanded={!isCollapsed}
          aria-controls={calendarGridId}
          className={cn(
            "flex h-8 min-w-0 flex-1 items-center gap-1.5 px-3 text-left text-xs font-semibold tabular-nums transition-colors hover:bg-sidebar-accent",
            sidebarFocus,
          )}
        >
          <CalendarDays aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.7} />
          <span className="min-w-0 flex-1 truncate">{monthLabel}</span>
          {isCollapsed ? (
            <ChevronUp aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
        {!isCollapsed && (
          <div className="flex shrink-0 items-center pr-2.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-auto px-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
              onClick={goToToday}
              title="返回今天"
              aria-label="返回今天"
            >
              今天
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
              onClick={goToPreviousMonth}
              aria-label="上个月"
              title="上个月"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground"
              onClick={goToNextMonth}
              aria-label="下个月"
              title="下个月"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div id={calendarGridId} hidden={isCollapsed} className="px-3 pb-2">
        {!isCollapsed && (
          <>
            {/* Week day headers */}
            <div className="mb-0.5 grid grid-cols-7 gap-px" aria-hidden="true">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-[11px] font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 justify-items-center gap-px">
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
                    aria-pressed={isSelected}
                    title={taskCount > 0 ? `${taskCount} 个事项` : undefined}
                    className={cn(
                      "relative grid size-6 place-items-center rounded-md text-[11px] tabular-nums transition-colors hover:bg-muted",
                      sidebarFocus,
                      !isCurrentMonth && "text-muted-foreground/70",
                      isSelected && !isToday && "bg-blue-50 font-semibold text-blue-800 ring-1 ring-inset ring-blue-200 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/40 dark:hover:bg-blue-500/25",
                      isToday && "bg-blue-600 font-semibold text-white hover:bg-blue-700 focus-visible:ring-white/85"
                    )}
                  >
                    {day.getDate()}
                    {taskCount > 0 && (
                      <span aria-hidden="true" className={cn("absolute bottom-0.5 size-[3px] rounded-full bg-blue-500", isToday && "bg-white")} />
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
