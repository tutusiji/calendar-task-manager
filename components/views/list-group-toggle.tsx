"use client"

import { FolderKanban, Calendar as CalendarIcon, Users } from "lucide-react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { cn } from "@/lib/utils"
import type { ListGroupMode } from "@/lib/types"

export function ListGroupToggle() {
  const { listGroupMode, setListGroupMode } = useCalendarStore()

  const groupModes: { mode: ListGroupMode; label: string; icon: React.ReactNode }[] = [
    { mode: "project", label: "按项目", icon: <FolderKanban className="h-4 w-4" /> },
    { mode: "date", label: "按时间", icon: <CalendarIcon className="h-4 w-4" /> },
    { mode: "user", label: "按人头", icon: <Users className="h-4 w-4" /> },
  ]

  return (
    <div className="flex items-center gap-1">
      {groupModes.map((item) => (
        <button
          key={item.mode}
          onClick={() => setListGroupMode(item.mode)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            "hover:bg-muted",
            listGroupMode === item.mode
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground"
          )}
          title={item.label}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
