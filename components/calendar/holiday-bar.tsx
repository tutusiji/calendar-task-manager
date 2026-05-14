"use client"

import type { Task } from "@/lib/types"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { cn } from "@/lib/utils"
import { getCalendarBarMetrics } from "@/lib/utils/calendar-bar-layout"

interface HolidayBarProps {
  task: Task
  date: Date
  track: number
  isWeekRow?: boolean
}

export function HolidayBar({
  task,
  date,
  track,
  isWeekRow = false,
}: HolidayBarProps) {
  const { hideWeekends, taskBarSize } = useCalendarStore()

  const countDays = (startDate: Date, endDate: Date): number => {
    let count = 0
    const current = new Date(startDate)
    current.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)

    while (current <= end) {
      const dayOfWeek = current.getDay()
      if (!hideWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }

    return count
  }

  const calculateDisplayDays = () => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const endDate = new Date(task.endDate)
    endDate.setHours(0, 0, 0, 0)

    const currentDayOfWeek = currentDate.getDay()
    const dayOfWeek = currentDayOfWeek === 0 ? 7 : currentDayOfWeek
    const weekEndDay = hideWeekends ? 5 : 7
    let daysUntilWeekEnd = 0

    if (hideWeekends) {
      daysUntilWeekEnd = dayOfWeek <= 5 ? 6 - dayOfWeek : 0
    } else {
      daysUntilWeekEnd = 8 - dayOfWeek
    }

    const remainingDays = countDays(currentDate, endDate)
    return Math.min(daysUntilWeekEnd, remainingDays)
  }

  const isTaskStart = () => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const startDate = new Date(task.startDate)
    startDate.setHours(0, 0, 0, 0)
    return currentDate.getTime() === startDate.getTime()
  }

  const isSegmentEnd = () => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)
    const endDate = new Date(task.endDate)
    endDate.setHours(0, 0, 0, 0)

    const displayDays = calculateDisplayDays()
    const lastDisplayDate = new Date(currentDate)
    lastDisplayDate.setDate(lastDisplayDate.getDate() + displayDays - 1)

    return (
      endDate.getTime() >= currentDate.getTime() &&
      endDate.getTime() <= lastDisplayDate.getTime()
    )
  }

  const getRoundedClass = () => {
    const isStart = isTaskStart()
    const isEnd = isSegmentEnd()

    if (isStart && isEnd) return "rounded-full"
    if (isStart && !isEnd) return "rounded-l-full"
    if (!isStart && isEnd) return "rounded-r-full"
    return ""
  }

  const spanDays = calculateDisplayDays()
  const TASK_HEIGHT = taskBarSize === "compact" ? 24 : 30
  const TASK_GAP = 4
  const barMetrics = getCalendarBarMetrics(
    spanDays,
    isWeekRow ? "padded-day" : "content-box"
  )

  return (
    <div
      className={cn(
        "task-bar absolute px-2 font-medium text-white bg-red-600 select-none",
        "shadow-sm",
        getRoundedClass()
      )}
      title={`法定节假日：${task.title}（系统只读）`}
      aria-label={`法定节假日：${task.title}（系统只读）`}
      style={{
        left: barMetrics.left,
        width: barMetrics.width,
        top: `${track * (TASK_HEIGHT + TASK_GAP) + (isWeekRow ? 4 : 0)}px`,
        height: `${TASK_HEIGHT}px`,
        zIndex: 5,
      }}
    >
      <div className="flex h-full items-center truncate text-xs font-semibold">
        <span className="truncate">{task.title}</span>
      </div>
    </div>
  )
}
