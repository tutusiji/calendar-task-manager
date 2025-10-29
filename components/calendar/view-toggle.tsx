"use client"

import { Users, User } from "lucide-react"
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
        onClick={() => setViewMode("personal")}
        className={cn("gap-2", viewMode === "personal" && "bg-background shadow-sm")}
      >
        <User className="h-4 w-4" />
        个人视图
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode("team")}
        className={cn("gap-2", viewMode === "team" && "bg-background shadow-sm")}
      >
        <Users className="h-4 w-4" />
        团队视图
      </Button>
    </div>
  )
}
