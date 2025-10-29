"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCalendarStore } from "@/lib/store/calendar-store"
import type { User } from "@/lib/types"
import { isSameDay } from "@/lib/utils/date-utils"
import { cn } from "@/lib/utils"

interface TeamMemberRowProps {
  user: User
  weekDays: Date[]
}

export function TeamMemberRow({ user, weekDays }: TeamMemberRowProps) {
  const { tasks, getProjectById } = useCalendarStore()

  const userTasks = tasks.filter((task) => task.userId === user.id)

  const getTasksForDay = (date: Date) => {
    return userTasks.filter((task) => {
      const taskStart = new Date(task.startDate)
      const taskEnd = new Date(task.endDate)
      taskStart.setHours(0, 0, 0, 0)
      taskEnd.setHours(23, 59, 59, 999)
      date.setHours(12, 0, 0, 0)
      return date >= taskStart && date <= taskEnd
    })
  }

  const getTaskColor = (type: string) => {
    switch (type) {
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

  return (
    <div className="flex border-b border-border hover:bg-muted/30 transition-colors">
      {/* User info */}
      <div className="w-48 flex-shrink-0 border-r border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </div>
        </div>
      </div>

      {/* Week days */}
      <div className="flex flex-1">
        {weekDays.map((day, index) => {
          const dayTasks = getTasksForDay(day)

          return (
            <div key={index} className="flex-1 border-r border-border p-2 last:border-r-0">
              <div className="space-y-1">
                {dayTasks.map((task) => {
                  const isStartDate = isSameDay(new Date(task.startDate), day)
                  const isEndDate = isSameDay(new Date(task.endDate), day)

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "px-2 py-1 text-xs font-medium text-white transition-all hover:opacity-90 cursor-pointer",
                        getTaskColor(task.type),
                        isStartDate && "rounded-l-full",
                        isEndDate && "rounded-r-full",
                        !isStartDate && !isEndDate && "rounded-none",
                      )}
                      title={task.title}
                    >
                      <div className="flex items-center gap-1 truncate">
                        {task.startTime && <span className="text-[10px] opacity-90">{task.startTime}</span>}
                        <span className="truncate">{task.title}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
