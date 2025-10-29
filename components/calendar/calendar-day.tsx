"use client"

import type React from "react"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { TaskBar } from "./task-bar"
import { cn } from "@/lib/utils"

interface CalendarDayProps {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isExpanded: boolean
  isDragTarget: boolean
  onExpand: () => void
  expandedRef?: React.RefObject<HTMLDivElement>
}

export function CalendarDay({
  date,
  isCurrentMonth,
  isToday,
  isExpanded,
  isDragTarget,
  onExpand,
  expandedRef,
}: CalendarDayProps) {
  const { getTasksForDate, startDragCreate, updateDragCreate, endDragCreate, dragState, openTaskCreation } =
    useCalendarStore()
  const [isHovering, setIsHovering] = useState(false)

  const tasks = getTasksForDate(date)
  const visibleTasks = isExpanded ? tasks : tasks.slice(0, 3)
  const hasMoreTasks = tasks.length > 3

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent drag creation when clicking on task bars or buttons
    if ((e.target as HTMLElement).closest(".task-bar")) return
    if ((e.target as HTMLElement).closest("button")) return

    e.preventDefault()
    startDragCreate(date, { x: e.clientX, y: e.clientY })
  }

  const handleMouseEnter = () => {
    setIsHovering(true)
    if (dragState.isCreating) {
      updateDragCreate(date)
    }
  }

  const handleMouseUp = () => {
    if (dragState.isCreating) {
      const result = endDragCreate()
      if (result) {
        openTaskCreation(result.startDate, result.endDate)
      }
    }
  }

  return (
    <div
      ref={isExpanded ? expandedRef : undefined}
      className={cn(
        "relative border-b border-r border-border p-2 transition-all last:border-r-0 select-none",
        !isCurrentMonth && "bg-muted/20",
        isToday && "bg-blue-50/50",
        isExpanded && "col-span-2 row-span-2 z-10 shadow-lg bg-card",
        isDragTarget && "bg-blue-100/50 ring-2 ring-blue-500 ring-inset",
        isHovering && !isDragTarget && "bg-muted/30",
      )}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovering(false)}
      onMouseUp={handleMouseUp}
    >
      {/* Date number */}
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
            isToday && "bg-primary text-primary-foreground",
            !isToday && isCurrentMonth && "text-foreground",
            !isToday && !isCurrentMonth && "text-muted-foreground",
          )}
        >
          {date.getDate()}
        </span>

        {hasMoreTasks && !isExpanded && (
          <button
            onClick={onExpand}
            className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-muted transition-colors"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-1">
        {visibleTasks.map((task) => (
          <TaskBar key={task.id} task={task} date={date} />
        ))}
      </div>

      {isDragTarget && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="h-6 rounded-full bg-blue-500/30 border-2 border-blue-500 w-[90%]" />
        </div>
      )}
    </div>
  )
}
