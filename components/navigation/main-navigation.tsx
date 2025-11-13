"use client"

import { Calendar, ListTodo, BarChart3 } from "lucide-react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { cn } from "@/lib/utils"
import type { MainViewMode } from "@/lib/types"

export function MainNavigation() {
  const { mainViewMode, setMainViewMode } = useCalendarStore()

  const navItems: { mode: MainViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: "calendar", label: "日历", icon: <Calendar className="h-5 w-5" /> },
    { mode: "list", label: "清单", icon: <ListTodo className="h-5 w-5" /> },
    { mode: "stats", label: "统计", icon: <BarChart3 className="h-5 w-5" /> },
  ]

  return (
    <div className="flex items-center gap-1">
      {navItems.map((item) => (
        <button
          key={item.mode}
          onClick={() => setMainViewMode(item.mode)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            "hover:bg-muted/50",
            mainViewMode === item.mode
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "text-muted-foreground"
          )}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
