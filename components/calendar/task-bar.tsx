"use client"

import type React from "react"

import { useCalendarStore } from "@/lib/store/calendar-store"
import type { Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { isSameDay } from "@/lib/utils/date-utils"

interface TaskBarProps {
  task: Task
  date: Date
}

export function TaskBar({ task, date }: TaskBarProps) {
  const { getProjectById, openTaskEdit } = useCalendarStore()
  const project = getProjectById(task.projectId)

  const isStartDate = isSameDay(new Date(task.startDate), date)
  const isEndDate = isSameDay(new Date(task.endDate), date)

  const getTaskColor = () => {
    switch (task.type) {
      case "daily":
        return "bg-blue-500"
      case "meeting":
        return "bg-yellow-500"
      case "vacation":
        return "bg-red-500"
      default:
        return "bg-blue-500"
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering calendar day's drag creation
    openTaskEdit(task)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "task-bar group relative cursor-pointer px-2 py-1 text-xs font-medium text-white transition-all hover:opacity-90 hover:shadow-md",
        getTaskColor(),
        isStartDate && "rounded-l-full",
        isEndDate && "rounded-r-full",
        !isStartDate && !isEndDate && "rounded-none",
      )}
    >
      <div className="flex items-center gap-1 truncate">
        {task.startTime && <span className="text-[10px] opacity-90">{task.startTime}</span>}
        <span className="truncate">{task.title}</span>
      </div>
    </div>
  )
}
