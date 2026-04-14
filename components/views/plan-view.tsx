"use client"

import {
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  Check,
  Edit3,
  Layers3,
  Loader2,
  MoreVertical,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { useCalendarStore } from "@/lib/store/calendar-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserMultiSelector } from "@/components/task/user-multi-selector"
import { cn } from "@/lib/utils"
import {
  planningAPI,
  type PlanningBoard,
  type PlanningBucket,
  type PlanningCard,
  type PlanningCardItem,
} from "@/lib/api/planning"
import {
  DEFAULT_PLANNING_BOARD_COLOR,
  DEFAULT_PLANNING_BUCKET_WIDTH,
  DEFAULT_PLANNING_CARD_COLOR,
  MAX_PLANNING_BUCKET_WIDTH,
  MIN_PLANNING_BUCKET_WIDTH,
  PLANNING_COLOR_PRESETS,
  type PlanningScopeType,
} from "@/lib/planning"
import { showToast } from "@/lib/toast"

const BOARD_SELECTION_STORAGE_KEY = "planning-board-selection-v1"
const PROGRESS_DISPLAY_STORAGE_KEY = "planning-progress-display-v1"

type ProgressDisplayMode = "fraction" | "percentage"

function readBoardSelections() {
  if (typeof window === "undefined") return {} as Record<string, string>

  try {
    return JSON.parse(localStorage.getItem(BOARD_SELECTION_STORAGE_KEY) || "{}") as Record<string, string>
  } catch (error) {
    console.error("Failed to parse planning board selections:", error)
    return {}
  }
}

function writeBoardSelection(scopeKey: string, boardId: string) {
  if (typeof window === "undefined" || !scopeKey) return

  const selections = readBoardSelections()
  if (boardId) {
    selections[scopeKey] = boardId
  } else {
    delete selections[scopeKey]
  }

  localStorage.setItem(BOARD_SELECTION_STORAGE_KEY, JSON.stringify(selections))
}

function readProgressDisplayMode() {
  if (typeof window === "undefined") return "fraction" as ProgressDisplayMode

  const storedValue = localStorage.getItem(PROGRESS_DISPLAY_STORAGE_KEY)
  return storedValue === "percentage" ? "percentage" : "fraction"
}

function writeProgressDisplayMode(mode: ProgressDisplayMode) {
  if (typeof window === "undefined") return
  localStorage.setItem(PROGRESS_DISPLAY_STORAGE_KEY, mode)
}

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function getCompletionStats(card: PlanningCard) {
  const totalCount = card.items.length
  const completedCount = card.items.filter((item) => item.isCompleted).length
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  return {
    totalCount,
    completedCount,
    percentage,
  }
}

function getContrastTextColor(hexColor: string) {
  const normalized = hexColor.replace("#", "")
  if (normalized.length !== 6) {
    return "#ffffff"
  }

  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.68 ? "#0f172a" : "#ffffff"
}

function getRandomPlanningCardColor() {
  const randomIndex = Math.floor(Math.random() * PLANNING_COLOR_PRESETS.length)
  return PLANNING_COLOR_PRESETS[randomIndex] || DEFAULT_PLANNING_CARD_COLOR
}

type ScopeContext =
  | {
      ready: true
      scopeType: PlanningScopeType
      scopeId: string
      scopeKey: string
      scopeName: string
      scopeCaption: string
    }
  | {
      ready: false
      scopeType?: undefined
      scopeId?: undefined
      scopeKey?: undefined
      scopeName: string
      scopeCaption: string
    }

type BoardDialogState = {
  open: boolean
  board?: PlanningBoard | null
}

type BucketDialogState = {
  open: boolean
  bucket?: PlanningBucket | null
}

type CardDialogState = {
  open: boolean
  bucketId?: string
  card?: PlanningCard | null
}

type DeleteConfirmState =
  | {
      type: "board"
      id: string
      name: string
    }
  | {
      type: "bucket"
      id: string
      name: string
    }
  | {
      type: "card"
      id: string
      name: string
    }
  | null

type DraggingCardState = {
  cardId: string
  bucketId: string
}

type CardDropIndicatorState = {
  bucketId: string
  targetCardId: string
  position: "before" | "after"
}

type DraggingBucketState = {
  bucketId: string
}

type BucketDropIndicatorState = {
  targetBucketId: string
  position: "before" | "after"
}

function shouldSubmitOnEnter(event: ReactKeyboardEvent<HTMLElement>) {
  return event.key === "Enter" && !event.shiftKey && !(event.target instanceof HTMLTextAreaElement)
}

export function PlanView() {
  const {
    navigationMode,
    selectedTeamId,
    selectedProjectId,
    currentUser,
    teams,
    projects,
  } = useCalendarStore()

  const scopeContext = useMemo<ScopeContext>(() => {
    if (!currentUser) {
      return {
        ready: false,
        scopeName: "计划",
        scopeCaption: "正在加载当前用户信息...",
      }
    }

    if (navigationMode === "team") {
      if (!selectedTeamId) {
        return {
          ready: false,
          scopeName: "团队计划",
          scopeCaption: "请先在左侧选择一个团队",
        }
      }

      const team = teams.find((item) => item.id === selectedTeamId)
      return {
        ready: true,
        scopeType: "TEAM",
        scopeId: selectedTeamId,
        scopeKey: `TEAM:${selectedTeamId}`,
        scopeName: team?.name || "团队计划",
        scopeCaption: "围绕团队目标维护非日历型工作卡片",
      }
    }

    if (navigationMode === "project") {
      if (!selectedProjectId) {
        return {
          ready: false,
          scopeName: "项目计划",
          scopeCaption: "请先在左侧选择一个项目",
        }
      }

      const project = projects.find((item) => item.id === selectedProjectId)
      return {
        ready: true,
        scopeType: "PROJECT",
        scopeId: selectedProjectId,
        scopeKey: `PROJECT:${selectedProjectId}`,
        scopeName: project?.name || "项目计划",
        scopeCaption: "管理文档、会议、专利和未来工作准备",
      }
    }

    return {
      ready: true,
      scopeType: "PERSONAL",
      scopeId: currentUser.id,
      scopeKey: `PERSONAL:${currentUser.id}`,
      scopeName: "我的计划",
      scopeCaption: "把尚未进入日历的工作准备先沉淀在计划板里",
    }
  }, [currentUser, navigationMode, selectedProjectId, selectedTeamId, projects, teams])

  const [boards, setBoards] = useState<PlanningBoard[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [boardDialogState, setBoardDialogState] = useState<BoardDialogState>({ open: false })
  const [bucketDialogState, setBucketDialogState] = useState<BucketDialogState>({ open: false })
  const [cardDialogState, setCardDialogState] = useState<CardDialogState>({ open: false })
  const [deleteConfirmState, setDeleteConfirmState] = useState<DeleteConfirmState>(null)
  const [itemDrafts, setItemDrafts] = useState<Record<string, string>>({})
  const [itemComposerCardId, setItemComposerCardId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemContent, setEditingItemContent] = useState("")
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null)
  const [activeItemActionId, setActiveItemActionId] = useState<string | null>(null)
  const [draggingBucket, setDraggingBucket] = useState<DraggingBucketState | null>(null)
  const [bucketDropIndicator, setBucketDropIndicator] = useState<BucketDropIndicatorState | null>(null)
  const [draggingCard, setDraggingCard] = useState<DraggingCardState | null>(null)
  const [cardDropIndicator, setCardDropIndicator] = useState<CardDropIndicatorState | null>(null)
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null)
  const [editingBucketTitle, setEditingBucketTitle] = useState("")
  const [editingBucketWidth, setEditingBucketWidth] = useState(DEFAULT_PLANNING_BUCKET_WIDTH)
  const [activeBucketActionId, setActiveBucketActionId] = useState<string | null>(null)
  const [progressDisplayMode, setProgressDisplayMode] = useState<ProgressDisplayMode>(() =>
    readProgressDisplayMode()
  )
  const [isBoardCanvasDragging, setIsBoardCanvasDragging] = useState(false)
  const [isBucketResizing, setIsBucketResizing] = useState(false)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef({
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })
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

  const selectedBoard = boards.find((board) => board.id === selectedBoardId) || null

  const loadBoards = async (silent = false) => {
    if (!scopeContext.ready) {
      setBoards([])
      setSelectedBoardId("")
      setIsLoading(false)
      return
    }

    if (silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const nextBoards = await planningAPI.getBoards(scopeContext.scopeType, scopeContext.scopeId)
      setBoards(nextBoards)

      const storedSelections = readBoardSelections()
      const storedBoardId = storedSelections[scopeContext.scopeKey]
      const nextSelectedBoardId =
        nextBoards.find((board) => board.id === selectedBoardId)?.id ||
        nextBoards.find((board) => board.id === storedBoardId)?.id ||
        nextBoards[0]?.id ||
        ""

      setSelectedBoardId(nextSelectedBoardId)
      writeBoardSelection(scopeContext.scopeKey, nextSelectedBoardId)
    } catch (error) {
      console.error("Failed to load planning boards:", error)
      showToast.error(
        "加载计划板失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadBoards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeContext.ready, scopeContext.scopeKey])

  const handleBoardSelection = (boardId: string) => {
    setSelectedBoardId(boardId)
    if (scopeContext.ready) {
      writeBoardSelection(scopeContext.scopeKey, boardId)
    }
  }

  const handleToggleProgressDisplayMode = () => {
    setProgressDisplayMode((current) => {
      const nextMode = current === "fraction" ? "percentage" : "fraction"
      writeProgressDisplayMode(nextMode)
      return nextMode
    })
  }

  const handleBoardCanvasMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    const target = event.target as HTMLElement
    if (target.closest("[data-plan-interactive='true']")) {
      return
    }

    const viewport = scrollViewportRef.current
    if (!viewport) return

    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    }

    setIsBoardCanvasDragging(true)
    event.preventDefault()
  }

  useEffect(() => {
    if (!isBoardCanvasDragging) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const viewport = scrollViewportRef.current
      if (!viewport) return

      const deltaX = event.clientX - dragStateRef.current.startX
      const deltaY = event.clientY - dragStateRef.current.startY

      viewport.scrollLeft = dragStateRef.current.scrollLeft - deltaX
      viewport.scrollTop = dragStateRef.current.scrollTop - deltaY
    }

    const handleMouseUp = () => {
      setIsBoardCanvasDragging(false)
    }

    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    }
  }, [isBoardCanvasDragging])

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

  const handleBoardSubmit = async (values: {
    name: string
    description: string
    color: string
  }) => {
    if (!scopeContext.ready) return

    try {
      setIsRefreshing(true)

      if (boardDialogState.board) {
        await planningAPI.updateBoard(boardDialogState.board.id, values)
        showToast.success("保存成功", "计划板已更新")
      } else {
        const createdBoard = await planningAPI.createBoard({
          scopeType: scopeContext.scopeType,
          scopeId: scopeContext.scopeId,
          ...values,
        })
        setSelectedBoardId(createdBoard.id)
        writeBoardSelection(scopeContext.scopeKey, createdBoard.id)
        showToast.success("创建成功", "新的计划板已创建")
      }

      setBoardDialogState({ open: false, board: null })
      await loadBoards(true)
    } catch (error) {
      console.error("Failed to save planning board:", error)
      showToast.error(
        "保存计划板失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      setIsRefreshing(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmState) return

    try {
      setIsRefreshing(true)

      if (deleteConfirmState.type === "board") {
        await planningAPI.deleteBoard(deleteConfirmState.id)
        showToast.success("删除成功", "计划板已删除")
      }

      if (deleteConfirmState.type === "bucket") {
        await planningAPI.deleteBucket(deleteConfirmState.id)
        showToast.success("删除成功", "分类列已删除")
      }

      if (deleteConfirmState.type === "card") {
        await planningAPI.deleteCard(deleteConfirmState.id)
        showToast.success("删除成功", "卡片已删除")
      }

      setDeleteConfirmState(null)
      await loadBoards(true)
    } catch (error) {
      console.error("Failed to delete planning entity:", error)
      showToast.error(
        deleteConfirmState.type === "board"
          ? "删除计划板失败"
          : deleteConfirmState.type === "bucket"
            ? "删除分类列失败"
            : "删除卡片失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      setIsRefreshing(false)
    }
  }

  const handleBucketSubmit = async (title: string) => {
    if (!selectedBoard) return

    try {
      setIsRefreshing(true)

      if (bucketDialogState.bucket) {
        await planningAPI.updateBucket(bucketDialogState.bucket.id, { title })
        showToast.success("保存成功", "分类列已更新")
      } else {
        await planningAPI.createBucket({
          boardId: selectedBoard.id,
          title,
        })
        showToast.success("创建成功", "分类列已创建")
      }

      setBucketDialogState({ open: false, bucket: null })
      await loadBoards(true)
    } catch (error) {
      console.error("Failed to save planning bucket:", error)
      showToast.error(
        "保存分类列失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      setIsRefreshing(false)
    }
  }

  const handleBoardDelete = () => {
    if (!selectedBoard) return

    setDeleteConfirmState({
      type: "board",
      id: selectedBoard.id,
      name: selectedBoard.name,
    })
  }

  const handleBucketDelete = (bucket: PlanningBucket) => {
    setDeleteConfirmState({
      type: "bucket",
      id: bucket.id,
      name: bucket.title,
    })
  }

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
      await loadBoards(true)
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

    setBoards((currentBoards) =>
      currentBoards.map((currentBoard) =>
        currentBoard.id === board.id
          ? {
              ...currentBoard,
              buckets: reorderedBuckets,
            }
          : currentBoard
      )
    )

    try {
      setIsRefreshing(true)
      await Promise.all(
        reorderedBuckets.map((bucket, index) =>
          planningAPI.updateBucket(bucket.id, {
            sortOrder: index,
          })
        )
      )
      await loadBoards(true)
    } catch (error) {
      console.error("Failed to reorder planning buckets:", error)
      showToast.error(
        "保存分类列顺序失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      await loadBoards(true)
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

  const handleCardSubmit = async (values: {
    title: string
    description: string
    headerColor: string
    assigneeIds: string[]
  }) => {
    const targetBucketId = cardDialogState.card?.bucketId || cardDialogState.bucketId
    if (!targetBucketId) return

    try {
      setIsRefreshing(true)

      if (cardDialogState.card) {
        await planningAPI.updateCard(cardDialogState.card.id, values)
        showToast.success("保存成功", "卡片已更新")
      } else {
        await planningAPI.createCard({
          bucketId: targetBucketId,
          ...values,
        })
        showToast.success("创建成功", "卡片已创建")
      }

      setCardDialogState({ open: false, card: null, bucketId: undefined })
      await loadBoards(true)
    } catch (error) {
      console.error("Failed to save planning card:", error)
      showToast.error(
        "保存卡片失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      setIsRefreshing(false)
    }
  }

  const handleCardDelete = (card: PlanningCard) => {
    setDeleteConfirmState({
      type: "card",
      id: card.id,
      name: card.title,
    })
  }

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

    setBoards((currentBoards) =>
      currentBoards.map((board) => ({
        ...board,
        buckets: board.buckets.map((currentBucket) =>
          currentBucket.id === bucket.id
            ? {
                ...currentBucket,
                cards: reorderedCards,
              }
            : currentBucket
        ),
      }))
    )

    try {
      setIsRefreshing(true)
      await Promise.all(
        reorderedCards.map((card, index) =>
          planningAPI.updateCard(card.id, {
            sortOrder: index,
          })
        )
      )
      await loadBoards(true)
    } catch (error) {
      console.error("Failed to reorder planning cards:", error)
      showToast.error(
        "保存卡片顺序失败",
        error instanceof Error ? error.message : "请稍后重试"
      )
      await loadBoards(true)
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

  const handleAddItem = async (cardId: string, content: string) => {
    const normalizedContent = content.trim()
    if (!normalizedContent) return

    try {
      setIsRefreshing(true)
      setActiveItemActionId(`create:${cardId}`)
      await planningAPI.createItem({
        cardId,
        content: normalizedContent,
      })
      setItemDrafts((current) => ({
        ...current,
        [cardId]: "",
      }))
      setItemComposerCardId(null)
      await loadBoards(true)
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
      await planningAPI.updateItem(item.id, {
        isCompleted: !item.isCompleted,
      })

      await loadBoards(true)
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
      await planningAPI.updateItem(itemId, {
        content: normalizedContent,
      })
      setEditingItemId(null)
      setEditingItemContent("")
      await loadBoards(true)
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
      await loadBoards(true)
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f6f3fb]">
        <div className="flex items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">正在加载计划板...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-col bg-[#f6f3fb]">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  {scopeContext.scopeName}
                  {selectedBoard && <span>{` —— ${selectedBoard.name}`}</span>}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedBoard?.description || scopeContext.scopeCaption}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedBoard && (
              <Select value={selectedBoardId} onValueChange={handleBoardSelection}>
                <SelectTrigger className="min-w-[220px] bg-white">
                  <SelectValue placeholder="选择计划板" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button onClick={() => setBoardDialogState({ open: true, board: null })}>
              <Plus className="mr-2 h-4 w-4" />
              新建计划板
            </Button>

            {selectedBoard && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setBucketDialogState({ open: true, bucket: null })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  新建分类
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setBoardDialogState({ open: true, board: selectedBoard })}
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  编辑计划板
                </Button>
                <Button variant="outline" onClick={handleBoardDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除计划板
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {!scopeContext.ready ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-[28px] border bg-white px-8 py-10 text-center shadow-sm">
            <h3 className="text-xl font-semibold text-foreground">{scopeContext.scopeName}</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{scopeContext.scopeCaption}</p>
          </div>
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-lg rounded-[32px] border border-dashed border-sky-200 bg-white px-10 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-100 text-sky-700">
              <Layers3 className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold text-foreground">先创建第一块计划板</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              你可以在这里维护非日历型工作，把文档、会议准备、专利推进、未来待办都拆成卡片和清单。
            </p>
            <Button className="mt-6" onClick={() => setBoardDialogState({ open: true, board: null })}>
              <Plus className="mr-2 h-4 w-4" />
              创建计划板
            </Button>
          </div>
        </div>
      ) : !selectedBoard ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          请选择一个计划板
        </div>
      ) : (
        <div className="relative flex-1 min-w-0 overflow-hidden">
          {isRefreshing && (
            <div className="pointer-events-none fixed left-1/2 top-1/2 z-50 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border bg-white/95 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
                {selectedBoard.buckets.map((bucket) => (
                  <div
                    key={bucket.id}
                    data-plan-interactive="true"
                    onDragOver={(event) => handleBucketDragOver(event, bucket.id)}
                    onDrop={(event) => void handleBucketDrop(event, selectedBoard, bucket.id)}
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
                                  onClick={() => handleBucketDelete(bucket)}
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
                      {bucket.cards.map((card) => {
                        const stats = getCompletionStats(card)
                        const headerTextColor = getContrastTextColor(card.headerColor)

                        return (
                          <div
                            key={card.id}
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
                                <p className="mb-2.5 text-sm leading-5 text-muted-foreground">
                                  {card.description}
                                </p>
                              )}

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
                                        className="group flex items-start gap-2.5 rounded-xl px-2 py-0.5 transition-colors hover:bg-slate-50"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleToggleItem(item)}
                                          className={cn(
                                            "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
                                            item.isCompleted
                                              ? "border-slate-300 bg-slate-300 text-white"
                                              : "border-slate-300 bg-white text-transparent hover:border-sky-500"
                                          )}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </button>
                                      <div className="min-w-0 flex-1">
                                        <div
                                          onDoubleClick={() => handleStartItemEdit(item)}
                                          className={cn(
                                            "cursor-text text-sm leading-5 transition-colors",
                                              item.isCompleted
                                                ? "text-slate-400 line-through"
                                                : "text-slate-700"
                                            )}
                                          >
                                            {item.content}
                                          </div>
                                        </div>
                                        <div className="relative flex w-[52px] items-center justify-end">
                                          <button
                                            type="button"
                                            onClick={() => handleStartDeleteItem(item.id)}
                                            className={cn(
                                              "transition-opacity",
                                              pendingDeleteItemId === item.id
                                                ? "pointer-events-none absolute opacity-0"
                                                : "opacity-0 group-hover:opacity-100"
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
                                  onClick={() => setCardDialogState({ open: true, card })}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-600"
                                  onClick={() => handleCardDelete(card)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <Button
                      variant="ghost"
                      className="mt-2.5 w-full justify-start rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600 hover:bg-slate-100"
                      onClick={() => setCardDialogState({ open: true, bucketId: bucket.id, card: null })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      新建卡片
                    </Button>
                  </div>
                ))}

              </div>
            </div>
          </div>
        </div>
      )}

      <PlanningBoardDialog
        open={boardDialogState.open}
        board={boardDialogState.board}
        onOpenChange={(open) => setBoardDialogState((current) => ({ ...current, open }))}
        onSubmit={handleBoardSubmit}
      />

      <PlanningBucketDialog
        open={bucketDialogState.open}
        bucket={bucketDialogState.bucket}
        onOpenChange={(open) => setBucketDialogState((current) => ({ ...current, open }))}
        onSubmit={handleBucketSubmit}
      />

      <PlanningCardDialog
        open={cardDialogState.open}
        card={cardDialogState.card}
        onOpenChange={(open) => setCardDialogState((current) => ({ ...current, open }))}
        onSubmit={handleCardSubmit}
      />

      <PlanningDeleteConfirmDialog
        target={deleteConfirmState}
        isLoading={isRefreshing}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmState(null)
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

function ColorPresetPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PLANNING_COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "h-8 w-8 rounded-full border-2 transition-transform",
              value === color ? "scale-110 border-foreground" : "border-white"
            )}
            style={{ backgroundColor: color }}
            aria-label={`选择颜色 ${color}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-3 py-2">
        <span className="text-sm text-muted-foreground">自定义颜色</span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-slate-200 bg-transparent"
        />
        <span className="rounded-full bg-white px-2 py-1 text-xs text-muted-foreground shadow-sm">
          {value}
        </span>
      </div>
    </div>
  )
}

function PlanningBoardDialog({
  open,
  board,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  board?: PlanningBoard | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { name: string; description: string; color: string }) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(DEFAULT_PLANNING_BOARD_COLOR)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(board?.name || "")
      setDescription(board?.description || "")
      setColor(board?.color || DEFAULT_PLANNING_BOARD_COLOR)
    }
  }, [board, open])

  const handleSubmit = async () => {
    if (!name.trim()) return

    try {
      setIsSubmitting(true)
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        color,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        onKeyDown={(event) => {
          if (shouldSubmitOnEnter(event)) {
            event.preventDefault()
            void handleSubmit()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{board ? "编辑计划板" : "新建计划板"}</DialogTitle>
          <DialogDescription>
            计划板用于承载同一作用域下的一组分类列和推进卡片。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">计划板名称</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：Q2 研发推进、专利储备、会议准备"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">计划板说明</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="补充这块计划板的用途和边界"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">主题颜色</label>
            <ColorPresetPicker value={color} onChange={setColor} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!name.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PlanningBucketDialog({
  open,
  bucket,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  bucket?: PlanningBucket | null
  onOpenChange: (open: boolean) => void
  onSubmit: (title: string) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(bucket?.title || "")
    }
  }, [bucket, open])

  const handleSubmit = async () => {
    if (!title.trim()) return

    try {
      setIsSubmitting(true)
      await onSubmit(title.trim())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={(event) => {
          if (shouldSubmitOnEnter(event)) {
            event.preventDefault()
            void handleSubmit()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{bucket ? "编辑分类列" : "新建分类列"}</DialogTitle>
          <DialogDescription>
            用分类列把不同类型的规划工作拆开管理。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">分类列名称</label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：需求分析、设计、会议筹备"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!title.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PlanningCardDialog({
  open,
  card,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  card?: PlanningCard | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: {
    title: string
    description: string
    headerColor: string
    assigneeIds: string[]
  }) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [headerColor, setHeaderColor] = useState(DEFAULT_PLANNING_CARD_COLOR)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(card?.title || "")
      setDescription(card?.description || "")
      setHeaderColor(card ? card.headerColor || DEFAULT_PLANNING_CARD_COLOR : getRandomPlanningCardColor())
      setAssigneeIds(card?.assignees.map((assignee) => assignee.userId) || [])
    }
  }, [card, open])

  const handleSubmit = async () => {
    if (!title.trim()) return

    try {
      setIsSubmitting(true)
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        headerColor,
        assigneeIds,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{card ? "编辑卡片" : "新建卡片"}</DialogTitle>
          <DialogDescription>
            卡片适合承载文档、会议、专利、需求梳理这类非日历型推进事项。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">卡片标题</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：撰写专利交底书、准备需求评审会议"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">卡片说明</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="补充卡片背景、目标和推进说明"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Header 颜色</label>
            <ColorPresetPicker value={headerColor} onChange={setHeaderColor} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">关联成员</label>
            <UserMultiSelector selectedUserIds={assigneeIds} onUserChange={setAssigneeIds} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!title.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PlanningDeleteConfirmDialog({
  target,
  isLoading,
  onOpenChange,
  onConfirm,
}: {
  target: DeleteConfirmState
  isLoading: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}) {
  if (!target) {
    return null
  }

  const title =
    target.type === "board"
      ? `确定删除计划板「${target.name}」吗？`
      : target.type === "bucket"
        ? `确定删除分类列「${target.name}」吗？`
        : `确定删除卡片「${target.name}」吗？`

  const description =
    target.type === "board"
      ? "删除后，其中的分类列、卡片和事项都会一起删除，且无法恢复。"
      : target.type === "bucket"
        ? "删除后，该分类列中的所有卡片和事项都会一起删除，且无法恢复。"
        : "删除后，卡片中的所有事项都会一起删除，且无法恢复。"

  return (
    <AlertDialog open={!!target} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={(event) => {
              event.preventDefault()
              void onConfirm()
            }}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isLoading ? "删除中..." : "确认删除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
