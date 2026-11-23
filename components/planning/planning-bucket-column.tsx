"use client"

import { Check,Edit3,Loader2,MoreVertical,Plus,Trash2,X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { DEFAULT_PLANNING_BUCKET_WIDTH } from "@/lib/planning"
import type { PlanningBoard,PlanningBucket,PlanningCard } from "@/lib/api/planning"
import { PlanningCardTile } from "./planning-card-tile"
import type { usePlanningBuckets } from "./use-planning-buckets"
import type { usePlanningCanvas } from "./use-planning-canvas"
import type { usePlanningItems } from "./use-planning-items"
import type { usePlanningCardOrder } from "./use-planning-card-order"

export interface PlanningBucketInteractions {
  buckets: ReturnType<typeof usePlanningBuckets>
  canvas: ReturnType<typeof usePlanningCanvas>
  items: ReturnType<typeof usePlanningItems>
  cardOrder: ReturnType<typeof usePlanningCardOrder>
  onDeleteBucket: (bucket: PlanningBucket) => void
  onNewCard: (bucketId: string) => void
  onEditCard: (card: PlanningCard) => void
  onDeleteCard: (card: PlanningCard) => void
}

export function PlanningBucketColumn({
  board, bucket, buckets, canvas, items, cardOrder, onDeleteBucket, onNewCard, onEditCard, onDeleteCard,
}: PlanningBucketInteractions & { board: PlanningBoard; bucket: PlanningBucket }) {
  const { draggingBucket, bucketDropIndicator, editingBucketId, editingBucketTitle, setEditingBucketTitle, editingBucketWidth, activeBucketActionId, handleStartBucketEdit, handleCancelBucketEdit, handleSaveBucketEdit, handleBucketResizeStart, handleBucketDragStart, handleBucketDragEnd, handleBucketDragOver, handleBucketDrop } = buckets

  return (
    <div
      data-plan-interactive="true"
      onDragOver={(event) => handleBucketDragOver(event, bucket.id)}
      onDrop={(event) => void handleBucketDrop(event, board, bucket.id)}
      className={cn(
        "relative shrink-0 cursor-default rounded-[24px] border border-slate-200/80 bg-white/90 p-2.5 shadow-sm backdrop-blur transition-shadow",
        editingBucketId === bucket.id && "shadow-[0_0_0_2px_rgba(56,189,248,0.18)]",
        draggingBucket?.bucketId === bucket.id && "opacity-55"
      )}
      style={{
        width:
          editingBucketId === bucket.id
            ? editingBucketWidth
            : bucket.width || DEFAULT_PLANNING_BUCKET_WIDTH,
      }}
    >
      {bucketDropIndicator?.targetBucketId === bucket.id && (
        <div
          className={cn(
            "pointer-events-none absolute top-4 bottom-4 z-20 w-1 rounded-full bg-linear-to-b from-cyan-400 via-sky-500 to-fuchsia-500 shadow-[0_0_10px_rgba(56,189,248,0.5)] animate-[pulse_0.65s_ease-in-out_infinite]",
            bucketDropIndicator.position === "before" ? "-left-1.5" : "-right-1.5"
          )}
        />
      )}
      {editingBucketId === bucket.id && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-[24px] border-2 border-sky-400/70 animate-pulse" />
          <div
            className="absolute inset-y-0 -left-1.5 z-20 w-3 cursor-ew-resize"
            onMouseDown={(event) => handleBucketResizeStart(event, bucket, "left")}
          />
          <div
            className="absolute inset-y-0 -right-1.5 z-20 w-3 cursor-ew-resize"
            onMouseDown={(event) => handleBucketResizeStart(event, bucket, "right")}
          />
        </>
      )}
      <div
        draggable={editingBucketId !== bucket.id}
        onDragStart={(event) => handleBucketDragStart(event, bucket)}
        onDragEnd={handleBucketDragEnd}
        className={cn(
          "mb-2 rounded-[18px] bg-slate-50 px-2.5 py-1.5",
          editingBucketId !== bucket.id && "cursor-grab active:cursor-grabbing"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          {editingBucketId === bucket.id ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <Input
                  value={editingBucketTitle}
                  autoFocus
                  onChange={(event) => setEditingBucketTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handleSaveBucketEdit(bucket.id)
                    }

                    if (event.key === "Escape") {
                      event.preventDefault()
                      handleCancelBucketEdit()
                    }
                  }}
                  placeholder="输入分类列名称..."
                  className="h-7 border-0 bg-white px-2 shadow-none focus-visible:ring-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  disabled={!editingBucketTitle.trim() || activeBucketActionId === bucket.id}
                  onClick={() => void handleSaveBucketEdit(bucket.id)}
                >
                  {activeBucketActionId === bucket.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={handleCancelBucketEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-7 items-center">
              <h3 className="text-base font-semibold leading-5 text-foreground">{bucket.title}</h3>
            </div>
          )}
          {editingBucketId !== bucket.id && (
            <div className="flex items-center gap-1.5">
              {bucket.cards.length > 0 && (
                <div className="flex items-center -space-x-0.5">
                  {bucket.cards.slice(0, 3).map((card) => (
                    <span
                      key={card.id}
                      className="h-2.5 w-2.5 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: card.headerColor }}
                    />
                  ))}
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => handleStartBucketEdit(bucket)}
                  >
                    <Edit3 className="h-4 w-4" />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    onClick={() => onDeleteBucket(bucket)}
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {bucket.cards.map((card) => (
        <PlanningCardTile
          key={card.id}
          card={card}
          bucket={bucket}
          canvas={canvas}
          items={items}
          cardOrder={cardOrder}
          onEditCard={onEditCard}
          onDeleteCard={onDeleteCard}
        />
      ))}
      </div>

      <Button
        variant="ghost"
        className="mt-2.5 w-full justify-start rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600 hover:bg-slate-100"
        onClick={() => onNewCard(bucket.id)}
      >
        <Plus className="mr-2 h-4 w-4" />
        新建卡片
      </Button>
    </div>
  )
}
