"use client"

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
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2"/>
          <line x1="8" y1="3" x2="8" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="3" x2="16" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="8" cy="13" r="1" fill="currentColor"/>
          <circle cx="12" cy="13" r="1" fill="currentColor"/>
          <circle cx="16" cy="13" r="1" fill="currentColor"/>
          <circle cx="8" cy="17" r="1" fill="currentColor"/>
          <circle cx="12" cy="17" r="1" fill="currentColor"/>
          <circle cx="16" cy="17" r="1" fill="currentColor"/>
        </svg>
        看月度
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode("week")}
        className={cn("gap-2", viewMode === "week" && "bg-background shadow-sm")}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2"/>
          <line x1="8" y1="3" x2="8" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="3" x2="16" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <rect x="6" y="12" width="3" height="7" rx="0.5" fill="currentColor"/>
          <rect x="10.5" y="12" width="3" height="7" rx="0.5" fill="currentColor"/>
          <rect x="15" y="12" width="3" height="7" rx="0.5" fill="currentColor"/>
        </svg>
        看周度
      </Button>
    </div>
  )
}
