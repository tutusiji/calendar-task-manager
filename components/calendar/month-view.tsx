"use client"

import { useState, useEffect, useRef } from "react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { getMonthDays, isSameDay } from "@/lib/utils/date-utils"
import { CalendarDay } from "./calendar-day"

export function MonthView() {
  const { currentDate, dragState } = useCalendarStore()
  const [expandedDate, setExpandedDate] = useState<Date | null>(null)
  const expandedRef = useRef<HTMLDivElement>(null)

  const monthDays = getMonthDays(currentDate.getFullYear(), currentDate.getMonth())
  const today = new Date()

  const weekDays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

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

      {/* Calendar grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {monthDays.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = isSameDay(day, today)
          const isExpanded = expandedDate && isSameDay(day, expandedDate)
          const isDragTarget = isInDragRange(day)

          return (
            <CalendarDay
              key={index}
              date={day}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              isExpanded={!!isExpanded}
              isDragTarget={isDragTarget}
              onExpand={() => setExpandedDate(isExpanded ? null : day)}
              expandedRef={isExpanded ? expandedRef : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}
