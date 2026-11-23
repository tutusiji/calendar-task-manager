"use client"

import { useState,type DragEvent as ReactDragEvent } from "react"
import { planningAPI,type PlanningBucket,type PlanningCard } from "@/lib/api/planning"

import { showToast } from "@/lib/toast"
import type { UpdatePlanningBoard } from "./use-planning-boards"

type DraggingCardState = {
  cardId: string
  bucketId: string
}

type CardDropIndicatorState = {
  bucketId: string
  targetCardId: string
  position: "before" | "after"
}

export function usePlanningCardOrder({ updateBoardDetail, refreshSelectedBoard, setIsRefreshing }: {
  updateBoardDetail: UpdatePlanningBoard
  refreshSelectedBoard: () => Promise<void>
  setIsRefreshing: (refreshing: boolean) => void
}) {
  const [draggingCard, setDraggingCard] = useState<DraggingCardState | null>(null)
  const [cardDropIndicator, setCardDropIndicator] = useState<CardDropIndicatorState | null>(null)

  const reorderCardsInBucket = async (
    bucket: PlanningBucket,
    movingCardId: string,
    targetCardId: string,
    position: "before" | "after"
  ) => {
    const currentCards = [...bucket.cards]
    const movingCardIndex = currentCards.findIndex((card) => card.id === movingCardId)
    const targetCardIndex = currentCards.findIndex((card) => card.id === targetCardId)

    if (movingCardIndex === -1 || targetCardIndex === -1 || movingCardId === targetCardId) {
      return
    }

    const [movingCard] = currentCards.splice(movingCardIndex, 1)
    const nextTargetIndex = currentCards.findIndex((card) => card.id === targetCardId)
    const insertIndex = position === "after" ? nextTargetIndex + 1 : nextTargetIndex

    currentCards.splice(insertIndex, 0, movingCard)

    if (currentCards.every((card, index) => card.id === bucket.cards[index]?.id)) {
      return
    }

    const reorderedCards = currentCards.map((card, index) => ({
      ...card,
      sortOrder: index,
    }))

    updateBoardDetail(bucket.boardId, (board) => ({
      ...board,
      buckets: board.buckets.map((current) => current.id === bucket.id
        ? { ...current, cards: reorderedCards }
        : current),
    }))

    try {
      setIsRefreshing(true)
      const results = await Promise.allSettled(currentCards.flatMap((card, index) =>
        card.sortOrder === index ? [] : [planningAPI.updateCard(card.id, { sortOrder: index })]
      ))
      const failed = results.find((result) => result.status === "rejected")
      if (failed) throw failed.reason
      setIsRefreshing(false)
    } catch (error) {
      console.error("Failed to reorder planning cards:", error)
      showToast.error(
        "保存卡片顺序失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      await refreshSelectedBoard()
    }
  }

  const handleCardDragStart = (
    event: ReactDragEvent<HTMLDivElement>,
    card: PlanningCard
  ) => {
    setDraggingCard({
      cardId: card.id,
      bucketId: card.bucketId,
    })
    setCardDropIndicator(null)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", card.id)
  }

  const handleCardDragEnd = () => {
    setDraggingCard(null)
    setCardDropIndicator(null)
  }

  const handleCardDragOver = (
    event: ReactDragEvent<HTMLDivElement>,
    bucket: PlanningBucket,
    targetCardId: string
  ) => {
    if (!draggingCard || draggingCard.bucketId !== bucket.id || draggingCard.cardId === targetCardId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"

    const rect = event.currentTarget.getBoundingClientRect()
    const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after"

    setCardDropIndicator((current) => {
      if (
        current?.bucketId === bucket.id &&
        current.targetCardId === targetCardId &&
        current.position === position
      ) {
        return current
      }

      return {
        bucketId: bucket.id,
        targetCardId,
        position,
      }
    })
  }

  const handleCardDrop = async (
    event: ReactDragEvent<HTMLDivElement>,
    bucket: PlanningBucket,
    targetCardId: string
  ) => {
    if (!draggingCard || draggingCard.bucketId !== bucket.id || draggingCard.cardId === targetCardId) {
      return
    }

    event.preventDefault()

    const rect = event.currentTarget.getBoundingClientRect()
    const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after"

    const movingCardId = draggingCard.cardId
    setDraggingCard(null)
    setCardDropIndicator(null)
    await reorderCardsInBucket(bucket, movingCardId, targetCardId, position)
  }

  return {
    draggingCard,
    cardDropIndicator,
    handleCardDragStart,
    handleCardDragEnd,
    handleCardDragOver,
    handleCardDrop,
  }
}
