"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { getMonthDays, isSameDay, getMonthName } from "@/lib/utils/date-utils"
import { cn } from "@/lib/utils"

export function MiniCalendar() {
  const { tasks, setCurrentDate, currentDate } = useCalendarStore()
  const [miniDate, setMiniDate] = useState(new Date())

  const monthDays = getMonthDays(miniDate.getFullYear(), miniDate.getMonth())
  const today = new Date()

  const goToPreviousMonth = () => {
    const newDate = new Date(miniDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setMiniDate(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(miniDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setMiniDate(newDate)
  }

  const goToToday = () => {
    setMiniDate(new Date())
  }

  const hasTasksOnDate = (date: Date) => {
    return tasks.some((task) => {
      const taskStart = new Date(task.startDate)
      const taskEnd = new Date(task.endDate)
      taskStart.setHours(0, 0, 0, 0)
      taskEnd.setHours(23, 59, 59, 999)
      date.setHours(12, 0, 0, 0)
      return date >= taskStart && date <= taskEnd
    })
  }

  const handleDateClick = (date: Date) => {
    setCurrentDate(date)
  }

  const weekDays = ["一", "二", "三", "四", "五", "六", "日"]

  return (
    <div className="bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {getMonthName(miniDate.getMonth())} {miniDate.getFullYear()}
        </h3>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-xs font-medium" 
            onClick={goToToday}
            title="返回今天"
          >
            今
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goToNextMonth}>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((day, index) => {
          const isCurrentMonth = day.getMonth() === miniDate.getMonth()
          const isToday = isSameDay(day, today)
          const hasTasks = hasTasksOnDate(day)

          return (
            <button
              key={index}
              onClick={() => handleDateClick(day)}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-md text-xs transition-colors",
                !isCurrentMonth && "text-muted-foreground/40",
                isCurrentMonth && "text-foreground hover:bg-muted",
                isToday && "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {day.getDate()}
              {hasTasks && isCurrentMonth && !isToday && (
                <div className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
