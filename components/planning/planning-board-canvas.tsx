"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PlanningBoard } from "@/lib/api/planning"
import { PlanningBucketColumn,type PlanningBucketInteractions } from "./planning-bucket-column"

export function PlanningBoardCanvas({ board, isRefreshing, ...interactions }: PlanningBucketInteractions & {
  board: PlanningBoard
  isRefreshing: boolean
}) {
  const { isBoardCanvasDragging, scrollViewportRef, handleBoardCanvasMouseDown } = interactions.canvas

  return (
    <div className="relative flex-1 min-w-0 overflow-hidden">
      {isRefreshing && (
        <div className="pointer-events-none fixed bottom-5 right-6 z-50 inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/96 px-3 py-2 text-xs text-muted-foreground shadow-[0_12px_28px_rgba(15,23,42,0.12)] backdrop-blur">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
          正在同步计划板...
        </div>
      )}

      <div
        ref={scrollViewportRef}
        onMouseDown={handleBoardCanvasMouseDown}
        className={cn(
          "h-full overflow-x-auto overflow-y-auto",
          isBoardCanvasDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <div className="min-w-max p-4">
          <div className="flex items-start gap-3">
            {board.buckets.map((bucket) => (
              <PlanningBucketColumn key={bucket.id} board={board} bucket={bucket} {...interactions} />
            ))}

          </div>
        </div>
      </div>
    </div>
  )
}
