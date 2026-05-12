"use client"

import { useMemo } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import type { PublicHoliday } from "@/lib/types"
import { cn } from "@/lib/utils"
import { assignTaskTracks } from "@/lib/utils/task-layout"
import { toPublicHolidayTasks } from "@/lib/utils/public-holiday-utils"
import { HolidayBar } from "./holiday-bar"

interface HolidayWeekRowProps {
  publicHolidays: PublicHoliday[]
  weekDays: Date[]
  showLabel?: boolean
}

export function HolidayWeekRow({
  publicHolidays,
  weekDays,
  showLabel = false,
}: HolidayWeekRowProps) {
  const { taskBarSize } = useCalendarStore()

  const holidaysWithTracks = useMemo(
    () => assignTaskTracks(toPublicHolidayTasks(publicHolidays)),
    [publicHolidays]
  )

  const getTasksToRenderForDay = (date: Date, dayIndex: number) => {
    const currentDate = new Date(date)
    currentDate.setHours(0, 0, 0, 0)

    return holidaysWithTracks.filter((task) => {
      const taskStart = new Date(task.startDate)
      taskStart.setHours(0, 0, 0, 0)
      const taskEnd = new Date(task.endDate)
      taskEnd.setHours(0, 0, 0, 0)

      if (taskStart.getTime() === currentDate.getTime()) {
        return true
      }

      const weekStart = new Date(weekDays[0])
      weekStart.setHours(0, 0, 0, 0)

      return (
        dayIndex === 0 &&
        taskStart.getTime() < weekStart.getTime() &&
        taskEnd.getTime() >= currentDate.getTime()
      )
    })
  }

  const maxTrack = useMemo(() => {
    const weekStart = new Date(weekDays[0])
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekDays[weekDays.length - 1])
    weekEnd.setHours(23, 59, 59, 999)

    const weekHolidayTasks = holidaysWithTracks.filter((task) => {
      const taskStart = new Date(task.startDate)
      taskStart.setHours(0, 0, 0, 0)
      const taskEnd = new Date(task.endDate)
      taskEnd.setHours(23, 59, 59, 999)
      return taskStart <= weekEnd && taskEnd >= weekStart
    })

    if (weekHolidayTasks.length === 0) return 0
    return Math.max(...weekHolidayTasks.map((task) => task.track)) + 1
  }, [holidaysWithTracks, weekDays])

  const TASK_HEIGHT = taskBarSize === "compact" ? 24 : 30
  const TASK_GAP = 4
  const rowHeight = Math.max(56, 32 + maxTrack * (TASK_HEIGHT + TASK_GAP))

  return (
    <div
      className="flex border-b border-border bg-red-50/30"
      style={{ minHeight: `${rowHeight}px` }}
    >
      {showLabel && (
        <div className="w-[120px] shrink-0 border-r border-border px-4 py-3">
          <div className="text-sm font-medium text-red-700">法定节假日</div>
          <div className="mt-1 text-xs text-red-600/80">系统只读</div>
        </div>
      )}

      <div className="flex flex-1 relative">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksToRenderForDay(day, index)

          return (
            <div
              key={`${day.toISOString()}-${index}`}
              className={cn(
                "flex-1 border-r border-border p-2 last:border-r-0 relative"
              )}
            >
              {dayTasks.map((task) => (
                <HolidayBar
                  key={task.id}
                  task={task}
                  date={day}
                  track={task.track}
                  isWeekRow={true}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
