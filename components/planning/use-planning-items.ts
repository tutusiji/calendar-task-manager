"use client"

import { useEffect,useRef,useState,type DragEvent as ReactDragEvent } from "react"
import { planningAPI,type PlanningCard,type PlanningCardItem } from "@/lib/api/planning"

import { showToast } from "@/lib/toast"
import type { UpdatePlanningBoard } from "./use-planning-boards"

const ITEM_HOVER_SUPPRESS_MIN_MS = 140
const ITEM_HOVER_SUPPRESS_MAX_MS = 900
const ITEM_HOVER_RELEASE_DISTANCE = 10

type DraggingItemState = {
  itemId: string
  cardId: string
}

type ItemDropIndicatorState = {
  cardId: string
  targetItemId: string
  position: "before" | "after"
}

export function usePlanningItems({ selectedBoardId, updateBoardDetail, refreshSelectedBoard, setIsRefreshing }: {
  updateBoardDetail: UpdatePlanningBoard
  refreshSelectedBoard: () => Promise<void>
  setIsRefreshing: (refreshing: boolean) => void
  selectedBoardId: string
}) {
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({})
  const [itemComposerCardId, setItemComposerCardId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemContent, setEditingItemContent] = useState("")
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null)
  const [activeItemActionId, setActiveItemActionId] = useState<string | null>(null)
  const [draggingItem, setDraggingItem] = useState<DraggingItemState | null>(null)
  const [itemDropIndicator, setItemDropIndicator] = useState<ItemDropIndicatorState | null>(null)
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
  const [isItemHoverSuppressed, setIsItemHoverSuppressed] = useState(false)
  const itemHoverSuppressionRef = useRef({
    clientX: 0,
    clientY: 0,
    startedAt: 0,
  })

  const updateCardItems = (cardId: string, update: (items: PlanningCardItem[]) => PlanningCardItem[]) => {
    updateBoardDetail(selectedBoardId, (board) => ({
      ...board,
      buckets: board.buckets.map((bucket) => ({
        ...bucket,
        cards: bucket.cards.map((card) => card.id === cardId ? { ...card, items: update(card.items) } : card),
      })),
    }))
  }

  useEffect(() => {
    if (!isItemHoverSuppressed) {
      return
    }

    let isCleared = false

    const clearItemHoverSuppression = () => {
      if (isCleared) {
        return
      }

      isCleared = true
      setIsItemHoverSuppressed(false)
    }

    const resolveHoveredItemIdFromElement = (element: Element | null) => {
      if (!(element instanceof HTMLElement)) {
        return null
      }

      return element.closest<HTMLElement>("[data-plan-item-id]")?.dataset.planItemId || null
    }

    const handlePointerMove = (event: PointerEvent) => {
      const { clientX, clientY, startedAt } = itemHoverSuppressionRef.current
      const elapsed = performance.now() - startedAt
      const distance = Math.hypot(event.clientX - clientX, event.clientY - clientY)

      if (elapsed < ITEM_HOVER_SUPPRESS_MIN_MS || distance < ITEM_HOVER_RELEASE_DISTANCE) {
        return
      }

      setHoveredItemId(
        resolveHoveredItemIdFromElement(document.elementFromPoint(event.clientX, event.clientY))
      )
      clearItemHoverSuppression()
    }

    const handlePointerDown = (event: PointerEvent) => {
      setHoveredItemId(resolveHoveredItemIdFromElement(event.target as Element | null))
      clearItemHoverSuppression()
    }

    const timeoutId = window.setTimeout(
      clearItemHoverSuppression,
      ITEM_HOVER_SUPPRESS_MAX_MS
    )

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerdown", handlePointerDown, { once: true })

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [isItemHoverSuppressed])

  const suppressItemHover = (clientX: number, clientY: number) => {
    itemHoverSuppressionRef.current = {
      clientX,
      clientY,
      startedAt: performance.now(),
    }
    setIsItemHoverSuppressed(true)
  }

  const reorderItemsInCard = async (
    card: PlanningCard,
    movingItemId: string,
    targetItemId: string,
    position: "before" | "after"
  ) => {
    const currentItems = [...card.items]
    const movingItemIndex = currentItems.findIndex((item) => item.id === movingItemId)
    const targetItemIndex = currentItems.findIndex((item) => item.id === targetItemId)

    if (movingItemIndex === -1 || targetItemIndex === -1 || movingItemId === targetItemId) {
      return
    }

    const [movingItem] = currentItems.splice(movingItemIndex, 1)
    const nextTargetIndex = currentItems.findIndex((item) => item.id === targetItemId)
    const insertIndex = position === "after" ? nextTargetIndex + 1 : nextTargetIndex

    currentItems.splice(insertIndex, 0, movingItem)

    if (currentItems.every((item, index) => item.id === card.items[index]?.id)) {
      return
    }

    const reorderedItems = [...currentItems]

    updateCardItems(card.id, () => reorderedItems)

    try {
      const reorderResult = await planningAPI.reorderItem(movingItemId, {
        targetItemId,
        position,
      })

      const affectedSortOrders = new Map(
        reorderResult.affectedItems.map((item) => [item.id, item.sortOrder])
      )

      updateCardItems(card.id, (items) => items.map((item) => ({
        ...item,
        sortOrder: affectedSortOrders.get(item.id) ?? item.sortOrder,
      })).sort((first, second) => first.sortOrder - second.sortOrder))
    } catch (error) {
      console.error("Failed to reorder planning items:", error)
      showToast.error(
        "保存事项顺序失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      await refreshSelectedBoard()
    }
  }

  const resolveItemDropTarget = (
    card: PlanningCard,
    targetItemId: string,
    position: "before" | "after"
  ) => {
    const targetItemIndex = card.items.findIndex((item) => item.id === targetItemId)
    if (targetItemIndex === -1) {
      return null
    }

    if (position === "before") {
      return {
        targetItemId,
        position: "before" as const,
      }
    }

    const nextItem = card.items[targetItemIndex + 1]
    if (nextItem) {
      return {
        targetItemId: nextItem.id,
        position: "before" as const,
      }
    }

    return {
      targetItemId,
      position: "after" as const,
    }
  }

  const handleItemDragStart = (
    event: ReactDragEvent<HTMLButtonElement>,
    item: PlanningCardItem
  ) => {
    setHoveredItemId(null)
    setDraggingItem({
      itemId: item.id,
      cardId: item.cardId,
    })
    setItemDropIndicator(null)
    setPendingDeleteItemId(null)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", item.id)
  }

  const handleItemDragEnd = (event: ReactDragEvent<HTMLButtonElement>) => {
    event.currentTarget.blur()
    suppressItemHover(event.clientX, event.clientY)
    setDraggingItem(null)
    setItemDropIndicator(null)
  }

  const handleItemDragOver = (
    event: ReactDragEvent<HTMLDivElement>,
    card: PlanningCard,
    targetItemId: string
  ) => {
    if (!draggingItem || draggingItem.cardId !== card.id || draggingItem.itemId === targetItemId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"

    const rect = event.currentTarget.getBoundingClientRect()
    const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after"
    const nextDropTarget = resolveItemDropTarget(card, targetItemId, position)

    if (!nextDropTarget || nextDropTarget.targetItemId === draggingItem.itemId) {
      setItemDropIndicator(null)
      return
    }

    setItemDropIndicator((current) => {
      if (
        current?.cardId === card.id &&
        current.targetItemId === nextDropTarget.targetItemId &&
        current.position === nextDropTarget.position
      ) {
        return current
      }

      return {
        cardId: card.id,
        targetItemId: nextDropTarget.targetItemId,
        position: nextDropTarget.position,
      }
    })
  }

  const handleItemDrop = async (
    event: ReactDragEvent<HTMLDivElement>,
    card: PlanningCard,
    targetItemId: string
  ) => {
    if (!draggingItem || draggingItem.cardId !== card.id || draggingItem.itemId === targetItemId) {
      return
    }

    event.preventDefault()

    const rect = event.currentTarget.getBoundingClientRect()
    const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after"
    const nextDropTarget = resolveItemDropTarget(card, targetItemId, position)
    if (!nextDropTarget || nextDropTarget.targetItemId === draggingItem.itemId) {
      suppressItemHover(event.clientX, event.clientY)
      setDraggingItem(null)
      setItemDropIndicator(null)
      return
    }

    const movingItemId = draggingItem.itemId
    suppressItemHover(event.clientX, event.clientY)
    setDraggingItem(null)
    setItemDropIndicator(null)
    await reorderItemsInCard(
      card,
      movingItemId,
      nextDropTarget.targetItemId,
      nextDropTarget.position
    )
  }

  const handleAddItem = async (cardId: string, content: string) => {
    const normalizedContent = content.trim()
    if (!normalizedContent) return

    try {
      setIsRefreshing(true)
      setActiveItemActionId(`create:${cardId}`)
      const item = await planningAPI.createItem({
        cardId,
        content: normalizedContent,
      })
      setItemDrafts((current) => ({
        ...current,
        [cardId]: "",
      }))
      setItemComposerCardId(null)
      updateCardItems(cardId, (items) => [...items, item])
      setIsRefreshing(false)
    } catch (error) {
      console.error("Failed to create planning item:", error)
      showToast.error(
        "新增事项失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      setIsRefreshing(false)
    } finally {
      setActiveItemActionId(null)
    }
  }

  const handleToggleItem = async (item: PlanningCardItem) => {
    try {
      const updated = await planningAPI.updateItem(item.id, {
        isCompleted: !item.isCompleted,
      })
      updateCardItems(updated.cardId, (items) => items.map((current) => current.id === updated.id
        ? { ...current, isCompleted: updated.isCompleted, completedAt: updated.completedAt, updatedAt: updated.updatedAt }
        : current))
    } catch (error) {
      console.error("Failed to toggle planning item:", error)
      showToast.error(
        "更新事项状态失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
    }
  }

  const handleStartItemComposer = (cardId: string) => {
    setItemComposerCardId(cardId)
    setEditingItemId(null)
    setEditingItemContent("")
    setPendingDeleteItemId(null)
  }

  const handleCancelItemComposer = () => {
    setItemComposerCardId(null)
  }

  const handleStartItemEdit = (item: PlanningCardItem) => {
    setEditingItemId(item.id)
    setEditingItemContent(item.content)
    setItemComposerCardId(null)
    setPendingDeleteItemId(null)
  }

  const handleCancelItemEdit = () => {
    setEditingItemId(null)
    setEditingItemContent("")
  }

  const handleSaveItemEdit = async (itemId: string) => {
    const normalizedContent = editingItemContent.trim()
    if (!normalizedContent) return

    try {
      setIsRefreshing(true)
      setActiveItemActionId(`edit:${itemId}`)
      const updated = await planningAPI.updateItem(itemId, {
        content: normalizedContent,
      })
      setEditingItemId(null)
      setEditingItemContent("")
      updateCardItems(updated.cardId, (items) => items.map((current) => current.id === updated.id
        ? { ...current, content: updated.content, updatedAt: updated.updatedAt }
        : current))
      setIsRefreshing(false)
    } catch (error) {
      console.error("Failed to update planning item:", error)
      showToast.error(
        "更新事项失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      setIsRefreshing(false)
    } finally {
      setActiveItemActionId(null)
    }
  }

  const handleStartDeleteItem = (itemId: string) => {
    setPendingDeleteItemId(itemId)
  }

  const handleCancelDeleteItem = () => {
    setPendingDeleteItemId(null)
  }

  const handleDeleteItem = async (item: PlanningCardItem) => {
    try {
      setIsRefreshing(true)
      setActiveItemActionId(`delete:${item.id}`)
      await planningAPI.deleteItem(item.id)
      setPendingDeleteItemId(null)
      updateCardItems(item.cardId, (items) => items.filter((current) => current.id !== item.id))
      setIsRefreshing(false)
    } catch (error) {
      console.error("Failed to delete planning item:", error)
      showToast.error(
        "删除事项失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      setIsRefreshing(false)
    } finally {
      setActiveItemActionId(null)
    }
  }

  return {
    itemDrafts,
    setItemDrafts,
    itemComposerCardId,
    editingItemId,
    editingItemContent,
    setEditingItemContent,
    pendingDeleteItemId,
    activeItemActionId,
    draggingItem,
    itemDropIndicator,
    hoveredItemId,
    setHoveredItemId,
    isItemHoverSuppressed,
    handleItemDragStart,
    handleItemDragEnd,
    handleItemDragOver,
    handleItemDrop,
    handleAddItem,
    handleToggleItem,
    handleStartItemComposer,
    handleCancelItemComposer,
    handleStartItemEdit,
    handleCancelItemEdit,
    handleSaveItemEdit,
    handleStartDeleteItem,
    handleCancelDeleteItem,
    handleDeleteItem,
  }
}
