"use client"

import { useCalendarStore } from "@/lib/store/calendar-store"
import { Button } from "@/components/ui/button"
import { AlignJustify, AlignCenter } from "lucide-react"
import { cn } from "@/lib/utils"

export function TaskSizeToggle() {
  const { taskBarSize, setTaskBarSize } = useCalendarStore()

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTaskBarSize("compact")}
        className={cn(
          "h-8 px-3",
          taskBarSize === "compact" && "bg-muted"
        )}
        title="紧凑型"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTaskBarSize("comfortable")}
        className={cn(
          "h-8 px-3",
          taskBarSize === "comfortable" && "bg-muted"
        )}
        title="宽松型"
      >
        <AlignJustify className="h-4 w-4" />
      </Button>
    </div>
  )
}
