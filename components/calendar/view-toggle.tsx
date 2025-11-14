"use client"

import { CalendarDays, CalendarRange } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { cn } from "@/lib/utils"

export function ViewToggle() {
  const { viewMode, setViewMode } = useCalendarStore()

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode("month")}
        className={cn("gap-2", viewMode === "month" && "bg-background shadow-sm")}
      >
        <CalendarDays className="h-4 w-4" />
        看月度
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode("week")}
        className={cn("gap-2", viewMode === "week" && "bg-background shadow-sm")}
      >
        <CalendarRange className="h-4 w-4" />
        看周度
      </Button>
    </div>
  )
}
