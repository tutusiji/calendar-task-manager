"use client"

import { LayoutGrid, Square, Grid2x2, Grid3x3 } from "lucide-react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { cn } from "@/lib/utils"
import type { ListLayoutColumns } from "@/lib/types"

export function ListLayoutToggle() {
  const { listLayoutColumns, setListLayoutColumns } = useCalendarStore()

  const layouts: { columns: ListLayoutColumns; icon: React.ReactNode; label: string }[] = [
    { columns: 1, icon: <Square className="h-4 w-4" />, label: "单列" },
    { columns: 2, icon: <Grid2x2 className="h-4 w-4" />, label: "双列" },
    { columns: 3, icon: <Grid3x3 className="h-4 w-4" />, label: "三列" },
    { columns: 4, icon: <LayoutGrid className="h-4 w-4" />, label: "四列" },
  ]

  return (
    <div className="flex items-center gap-1 border border-border rounded-md p-0.5 bg-muted/30">
      {layouts.map((layout) => (
        <button
          key={layout.columns}
          onClick={() => setListLayoutColumns(layout.columns)}
          className={cn(
            "flex items-center justify-center p-1.5 rounded transition-colors",
            "hover:bg-background",
            listLayoutColumns === layout.columns
              ? "bg-background shadow-sm"
              : "text-muted-foreground"
          )}
          title={layout.label}
        >
          {layout.icon}
        </button>
      ))}
    </div>
  )
}
