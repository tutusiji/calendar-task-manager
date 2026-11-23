"use client"

import { useEffect,useRef,useState,type DragEvent as ReactDragEvent,type MouseEvent as ReactMouseEvent } from "react"
import { planningAPI,type PlanningBoard,type PlanningBucket } from "@/lib/api/planning"
import { DEFAULT_PLANNING_BUCKET_WIDTH,MIN_PLANNING_BUCKET_WIDTH,MAX_PLANNING_BUCKET_WIDTH } from "@/lib/planning"
import { showToast } from "@/lib/toast"
import type { UpdatePlanningBoard } from "./use-planning-boards"

type DraggingBucketState = {
  bucketId: string
}

type BucketDropIndicatorState = {
  targetBucketId: string
  position: "before" | "after"
}

export function usePlanningBuckets({ updateBoardDetail, refreshSelectedBoard, setIsRefreshing }: {
  updateBoardDetail: UpdatePlanningBoard
  refreshSelectedBoard: () => Promise<void>
  setIsRefreshing: (refreshing: boolean) => void
}) {
  const [draggingBucket, setDraggingBucket] = useState<DraggingBucketState | null>(null)
  const [bucketDropIndicator, setBucketDropIndicator] = useState<BucketDropIndicatorState | null>(null)
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null)
  const [editingBucketTitle, setEditingBucketTitle] = useState("")
  const [editingBucketWidth, setEditingBucketWidth] = useState(DEFAULT_PLANNING_BUCKET_WIDTH)
  const [activeBucketActionId, setActiveBucketActionId] = useState<string | null>(null)
  const [isBucketResizing, setIsBucketResizing] = useState(false)
  const bucketResizeStateRef = useRef<{
    bucketId: string | null
    side: "left" | "right"
    startX: number
    startWidth: number
  }>({
    bucketId: null,
    side: "right",
    startX: 0,
    startWidth: DEFAULT_PLANNING_BUCKET_WIDTH,
  })

  useEffect(() => {
    if (!isBucketResizing) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!editingBucketId || bucketResizeStateRef.current.bucketId !== editingBucketId) {
        return
      }

      const deltaX = event.clientX - bucketResizeStateRef.current.startX
      const nextWidth =
        bucketResizeStateRef.current.side === "right"
          ? bucketResizeStateRef.current.startWidth + deltaX
          : bucketResizeStateRef.current.startWidth - deltaX

      setEditingBucketWidth(
        Math.min(
          MAX_PLANNING_BUCKET_WIDTH,
          Math.max(MIN_PLANNING_BUCKET_WIDTH, Math.round(nextWidth))
        )
      )
    }

    const handleMouseUp = () => {
      setIsBucketResizing(false)
      bucketResizeStateRef.current.bucketId = null
    }

    document.body.style.userSelect = "none"
    document.body.style.cursor = "ew-resize"

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    }
  }, [editingBucketId, isBucketResizing])

  const handleStartBucketEdit = (bucket: PlanningBucket) => {
    setEditingBucketId(bucket.id)
    setEditingBucketTitle(bucket.title)
    setEditingBucketWidth(bucket.width || DEFAULT_PLANNING_BUCKET_WIDTH)
  }

  const handleCancelBucketEdit = () => {
    setEditingBucketId(null)
    setEditingBucketTitle("")
    setEditingBucketWidth(DEFAULT_PLANNING_BUCKET_WIDTH)
    setIsBucketResizing(false)
    bucketResizeStateRef.current.bucketId = null
  }

  const handleSaveBucketEdit = async (bucketId: string) => {
    const normalizedTitle = editingBucketTitle.trim()
    if (!normalizedTitle) return

    try {
      setIsRefreshing(true)
      setActiveBucketActionId(bucketId)
      await planningAPI.updateBucket(bucketId, {
        title: normalizedTitle,
        width: editingBucketWidth,
      })
      setEditingBucketId(null)
      setEditingBucketTitle("")
      setEditingBucketWidth(DEFAULT_PLANNING_BUCKET_WIDTH)
      setIsBucketResizing(false)
      bucketResizeStateRef.current.bucketId = null
      showToast.success("保存成功", "分类列已更新")
      await refreshSelectedBoard()
    } catch (error) {
      console.error("Failed to update planning bucket inline:", error)
      showToast.error(
        "保存分类列失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      setIsRefreshing(false)
    } finally {
      setActiveBucketActionId(null)
    }
  }

  const handleBucketResizeStart = (
    event: ReactMouseEvent<HTMLDivElement>,
    bucket: PlanningBucket,
    side: "left" | "right"
  ) => {
    event.preventDefault()
    event.stopPropagation()

    if (editingBucketId !== bucket.id) {
      return
    }

    bucketResizeStateRef.current = {
      bucketId: bucket.id,
      side,
      startX: event.clientX,
      startWidth: editingBucketWidth || bucket.width || DEFAULT_PLANNING_BUCKET_WIDTH,
    }

    setIsBucketResizing(true)
  }

  const reorderBucketsInBoard = async (
    board: PlanningBoard,
    movingBucketId: string,
    targetBucketId: string,
    position: "before" | "after"
  ) => {
    const currentBuckets = [...board.buckets]
    const movingBucketIndex = currentBuckets.findIndex((bucket) => bucket.id === movingBucketId)
    const targetBucketIndex = currentBuckets.findIndex((bucket) => bucket.id === targetBucketId)

    if (movingBucketIndex === -1 || targetBucketIndex === -1 || movingBucketId === targetBucketId) {
      return
    }

    const [movingBucket] = currentBuckets.splice(movingBucketIndex, 1)
    const nextTargetIndex = currentBuckets.findIndex((bucket) => bucket.id === targetBucketId)
    const insertIndex = position === "after" ? nextTargetIndex + 1 : nextTargetIndex

    currentBuckets.splice(insertIndex, 0, movingBucket)

    if (currentBuckets.every((bucket, index) => bucket.id === board.buckets[index]?.id)) {
      return
    }

    const reorderedBuckets = currentBuckets.map((bucket, index) => ({
      ...bucket,
      sortOrder: index,
    }))

    updateBoardDetail(board.id, (current) => ({ ...current, buckets: reorderedBuckets }))

    try {
      setIsRefreshing(true)
      const results = await Promise.allSettled(currentBuckets.flatMap((bucket, index) =>
        bucket.sortOrder === index ? [] : [planningAPI.updateBucket(bucket.id, { sortOrder: index })]
      ))
      const failed = results.find((result) => result.status === "rejected")
      if (failed) throw failed.reason
      setIsRefreshing(false)
    } catch (error) {
      console.error("Failed to reorder planning buckets:", error)
      showToast.error(
        "保存分类列顺序失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      await refreshSelectedBoard()
    }
  }

  const handleBucketDragStart = (
    event: ReactDragEvent<HTMLDivElement>,
    bucket: PlanningBucket
  ) => {
    if (editingBucketId === bucket.id || isBucketResizing) {
      event.preventDefault()
      return
    }

    setDraggingBucket({
      bucketId: bucket.id,
    })
    setBucketDropIndicator(null)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", bucket.id)
  }

  const handleBucketDragEnd = () => {
    setDraggingBucket(null)
    setBucketDropIndicator(null)
  }

  const handleBucketDragOver = (
    event: ReactDragEvent<HTMLDivElement>,
    targetBucketId: string
  ) => {
    if (!draggingBucket || draggingBucket.bucketId === targetBucketId) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"

    const rect = event.currentTarget.getBoundingClientRect()
    const position = event.clientX < rect.left + rect.width / 2 ? "before" : "after"

    setBucketDropIndicator((current) => {
      if (
        current?.targetBucketId === targetBucketId &&
        current.position === position
      ) {
        return current
      }

      return {
        targetBucketId,
        position,
      }
    })
  }

  const handleBucketDrop = async (
    event: ReactDragEvent<HTMLDivElement>,
    board: PlanningBoard,
    targetBucketId: string
  ) => {
    if (!draggingBucket || draggingBucket.bucketId === targetBucketId) {
      return
    }

    event.preventDefault()

    const rect = event.currentTarget.getBoundingClientRect()
    const position = event.clientX < rect.left + rect.width / 2 ? "before" : "after"

    const movingBucketId = draggingBucket.bucketId
    setDraggingBucket(null)
    setBucketDropIndicator(null)
    await reorderBucketsInBoard(board, movingBucketId, targetBucketId, position)
  }

  return {
    draggingBucket,
    bucketDropIndicator,
    editingBucketId,
    editingBucketTitle,
    setEditingBucketTitle,
    editingBucketWidth,
    activeBucketActionId,
    handleStartBucketEdit,
    handleCancelBucketEdit,
    handleSaveBucketEdit,
    handleBucketResizeStart,
    handleBucketDragStart,
    handleBucketDragEnd,
    handleBucketDragOver,
    handleBucketDrop,
  }
}
