"use client"

import { Check,GripVertical,Loader2,Trash2,X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { PlanningCard } from "@/lib/api/planning"
import type { usePlanningItems } from "./use-planning-items"

export function PlanningItemList({ card, items }: {
  card: PlanningCard
  items: ReturnType<typeof usePlanningItems>
}) {
  const { itemDrafts, setItemDrafts, itemComposerCardId, editingItemId, editingItemContent, setEditingItemContent, pendingDeleteItemId, activeItemActionId, draggingItem, itemDropIndicator, hoveredItemId, setHoveredItemId, isItemHoverSuppressed, handleItemDragStart, handleItemDragEnd, handleItemDragOver, handleItemDrop, handleAddItem, handleToggleItem, handleCancelItemComposer, handleStartItemEdit, handleCancelItemEdit, handleSaveItemEdit, handleStartDeleteItem, handleCancelDeleteItem, handleDeleteItem } = items

  return (
    <div className="space-y-1.5">
      {card.items.length === 0 && itemComposerCardId !== card.id ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-muted-foreground">
          还没有事项，点击底部加号添加第一条待办。
        </div>
      ) : (
        card.items.map((item) => (
          editingItemId === item.id ? (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/70 px-2 py-1.5"
            >
              <div className="w-3.5 shrink-0" />
              <div className="h-[18px] w-[18px] shrink-0 rounded-full border border-sky-200 bg-white" />
              <Input
                value={editingItemContent}
                autoFocus
                onChange={(event) => setEditingItemContent(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void handleSaveItemEdit(item.id)
                  }

                  if (event.key === "Escape") {
                    event.preventDefault()
                    handleCancelItemEdit()
                  }
                }}
                placeholder="编辑事项内容..."
                className="h-8 border-0 bg-white/90 px-2.5 shadow-none focus-visible:ring-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                disabled={!editingItemContent.trim() || activeItemActionId === `edit:${item.id}`}
                onClick={() => void handleSaveItemEdit(item.id)}
              >
                {activeItemActionId === `edit:${item.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={handleCancelItemEdit}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              key={item.id}
              data-plan-item-id={item.id}
              onPointerEnter={() => {
                if (!isItemHoverSuppressed) {
                  setHoveredItemId(item.id)
                }
              }}
              onPointerMove={() => {
                if (!isItemHoverSuppressed && hoveredItemId !== item.id) {
                  setHoveredItemId(item.id)
                }
              }}
              onPointerLeave={() => {
                setHoveredItemId((current) =>
                  current === item.id ? null : current
                )
              }}
              onDragOver={(event) => handleItemDragOver(event, card, item.id)}
              onDrop={(event) => void handleItemDrop(event, card, item.id)}
              className={cn(
                "group relative flex items-center gap-1 rounded-xl pl-1 pr-2 py-0.5",
                "transition-colors",
                hoveredItemId === item.id && "bg-slate-50",
                draggingItem?.itemId === item.id && "opacity-55"
              )}
            >
              {itemDropIndicator?.cardId === card.id &&
                itemDropIndicator.targetItemId === item.id && (
                  <div
                    className={cn(
                      "pointer-events-none absolute left-2 right-2 z-20 h-0.5 rounded-full bg-linear-to-r from-cyan-400 via-sky-500 to-fuchsia-500 shadow-[0_0_10px_rgba(56,189,248,0.45)]",
                      itemDropIndicator.position === "before"
                        ? "top-0"
                        : "bottom-0"
                    )}
                  />
                )}
              <div className="flex w-3.5 shrink-0 self-center justify-center">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => handleItemDragStart(event, item)}
                  onDragEnd={handleItemDragEnd}
                  className={cn(
                    "inline-flex h-4 w-4 items-center justify-center cursor-grab rounded-sm p-0 text-slate-300 opacity-60 transition-all focus-visible:opacity-100 focus-visible:text-slate-500 md:opacity-0 active:cursor-grabbing",
                    hoveredItemId === item.id && "md:opacity-100",
                    !isItemHoverSuppressed && "hover:text-slate-500"
                  )}
                  aria-label="拖拽排序事项"
                  title="拖拽调整顺序"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleToggleItem(item)}
                className={cn(
                  "mr-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center self-center rounded-full border transition-colors",
                  item.isCompleted
                    ? "border-slate-300 bg-slate-300 text-white"
                    : cn(
                        "border-slate-300 bg-white text-transparent",
                        !isItemHoverSuppressed && "hover:border-sky-500"
                      )
                )}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            <div className="min-w-0 flex-1 self-center">
              <div
                onDoubleClick={() => handleStartItemEdit(item)}
                className={cn(
                  "cursor-text break-all text-sm leading-5 transition-colors",
                    item.isCompleted
                      ? "text-slate-400 line-through"
                      : "text-slate-700"
                  )}
                >
                  {item.content}
                </div>
              </div>
              <div className="relative flex w-[52px] shrink-0 items-center justify-end self-center">
                <button
                  type="button"
                  onClick={() => handleStartDeleteItem(item.id)}
                  className={cn(
                    "transition-opacity",
                    pendingDeleteItemId === item.id
                      ? "pointer-events-none absolute opacity-0"
                      : cn(
                          "opacity-0",
                          hoveredItemId === item.id && "opacity-100"
                        )
                  )}
                  aria-label="删除事项"
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                </button>
                <div
                  className={cn(
                    "flex items-center gap-0.5 overflow-hidden transition-all duration-200 ease-out",
                    pendingDeleteItemId === item.id
                      ? "w-[52px] translate-x-0 opacity-100"
                      : "w-0 translate-x-3 opacity-0"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void handleDeleteItem(item)}
                    disabled={activeItemActionId === `delete:${item.id}`}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-emerald-600 disabled:opacity-60"
                    aria-label="确认删除事项"
                  >
                    {activeItemActionId === `delete:${item.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelDeleteItem}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-700"
                    aria-label="取消删除事项"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        ))
      )}

      {itemComposerCardId === card.id && (
        <div className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/70 px-2 py-1.5">
          <div className="w-3.5 shrink-0" />
          <div className="h-[18px] w-[18px] shrink-0 rounded-full border border-sky-200 bg-white" />
          <Input
            value={itemDrafts[card.id] || ""}
            autoFocus
            onChange={(event) =>
              setItemDrafts((current) => ({
                ...current,
                [card.id]: event.target.value,
              }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void handleAddItem(card.id, itemDrafts[card.id] || "")
              }

              if (event.key === "Escape") {
                event.preventDefault()
                handleCancelItemComposer()
              }
            }}
            placeholder="输入一条新的事项..."
            className="h-8 border-0 bg-white/90 px-2.5 shadow-none focus-visible:ring-1"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={!((itemDrafts[card.id] || "").trim()) || activeItemActionId === `create:${card.id}`}
            onClick={() => void handleAddItem(card.id, itemDrafts[card.id] || "")}
          >
            {activeItemActionId === `create:${card.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleCancelItemComposer}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
