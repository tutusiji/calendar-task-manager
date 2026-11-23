"use client"

import { Edit3,Plus,Trash2,Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar,AvatarFallback,AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getCompletionStats,getContrastTextColor,getInitials } from "./planning-ui-helpers"
import type { PlanningBucket,PlanningCard } from "@/lib/api/planning"
import { PlanningItemList } from "./planning-item-list"
import type { usePlanningCanvas } from "./use-planning-canvas"
import type { usePlanningItems } from "./use-planning-items"
import type { usePlanningCardOrder } from "./use-planning-card-order"

export function PlanningCardTile({ card, bucket, canvas, items, cardOrder, onEditCard, onDeleteCard }: {
  card: PlanningCard
  bucket: PlanningBucket
  canvas: ReturnType<typeof usePlanningCanvas>
  items: ReturnType<typeof usePlanningItems>
  cardOrder: ReturnType<typeof usePlanningCardOrder>
  onEditCard: (card: PlanningCard) => void
  onDeleteCard: (card: PlanningCard) => void
}) {
  const { progressDisplayMode, handleToggleProgressDisplayMode } = canvas
  const { handleStartItemComposer } = items
  const { draggingCard, cardDropIndicator, handleCardDragStart, handleCardDragEnd, handleCardDragOver, handleCardDrop } = cardOrder

  const stats = getCompletionStats(card)
  const headerTextColor = getContrastTextColor(card.headerColor)
  return (
    <div
      onDragOver={(event) => handleCardDragOver(event, bucket, card.id)}
      onDrop={(event) => void handleCardDrop(event, bucket, card.id)}
      className={cn(
        "relative overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-opacity",
        draggingCard?.cardId === card.id && "opacity-50"
      )}
    >
      {cardDropIndicator?.bucketId === bucket.id &&
        cardDropIndicator.targetCardId === card.id && (
          <div
            className={cn(
              "pointer-events-none absolute left-3 right-3 z-20 h-1 rounded-full bg-linear-to-r from-cyan-400 via-sky-500 to-fuchsia-500 shadow-[0_0_10px_rgba(56,189,248,0.5)] animate-[pulse_0.65s_ease-in-out_infinite]",
              cardDropIndicator.position === "before" ? "top-0" : "bottom-0"
            )}
          />
        )}
      <div
        draggable
        onDragStart={(event) => handleCardDragStart(event, card)}
        onDragEnd={handleCardDragEnd}
        className="cursor-grab px-3.5 py-2.5 active:cursor-grabbing"
        style={{
          backgroundColor: card.headerColor,
          color: headerTextColor,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[15px] font-semibold leading-5">{card.title}</div>
          </div>
          <button
            type="button"
            onClick={handleToggleProgressDisplayMode}
            className="cursor-pointer appearance-none rounded-full border-0 px-2 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: `${headerTextColor}1A`,
              color: headerTextColor,
            }}
            title={
              progressDisplayMode === "fraction"
                ? "点击切换为百分比"
                : "点击切换为完成数量"
            }
            aria-label="切换进度显示方式"
          >
            {progressDisplayMode === "fraction"
              ? `${stats.completedCount}/${stats.totalCount}`
              : `${stats.percentage}%`}
          </button>
        </div>
      </div>

      <div className="px-2 py-3">
        {card.description && (
          <p className="mb-2.5 break-all text-sm leading-5 text-muted-foreground">
            {card.description}
          </p>
        )}

        <PlanningItemList card={card} items={items} />
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-3.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            {card.assignees.slice(0, 3).map((assignee) => (
              <Avatar
                key={assignee.id}
                className="h-6 w-6 border-2 border-white shadow-sm"
              >
                <AvatarImage src={assignee.user.avatar || undefined} alt={assignee.user.name} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(assignee.user.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {card.assignees.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{card.assignees.length - 3}
            </span>
          )}
          {card.assignees.length === 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              暂无关联人
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleStartItemComposer(card.id)}
            title="新增事项"
            aria-label="新增事项"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEditCard(card)}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600"
            onClick={() => onDeleteCard(card)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
