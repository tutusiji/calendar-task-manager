"use client"

import {
useMemo,useState
} from "react"
import {
Edit3,Layers3,
Loader2,Plus,
Trash2
} from "lucide-react"
import { useCalendarState } from "@/lib/store/use-calendar-state"
import { Button } from "@/components/ui/button"
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select"
import {
planningAPI,type PlanningBoardSummary,
type PlanningBucket,
type PlanningCard
} from "@/lib/api/planning"
import { showToast } from "@/lib/toast"
import type { PlanningScope } from "@/components/planning/planning-scope"
import { PlanningBoardDialog,PlanningBucketDialog,PlanningCardDialog,PlanningDeleteConfirmDialog,type DeleteConfirmState } from "@/components/planning/planning-dialogs"
import { usePlanningBoards } from "@/components/planning/use-planning-boards"
import { PlanningBoardCanvas } from "@/components/planning/planning-board-canvas"
import { usePlanningItems } from "@/components/planning/use-planning-items"
import { usePlanningBuckets } from "@/components/planning/use-planning-buckets"
import { usePlanningCardOrder } from "@/components/planning/use-planning-card-order"
import { usePlanningCanvas } from "@/components/planning/use-planning-canvas"

type BoardDialogState = {
  open: boolean
  board?: PlanningBoardSummary | null
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

export function PlanView() {
  const {
    navigationMode,
    selectedTeamId,
    selectedProjectId,
    currentUser,
    teams,
    projects,
  } = useCalendarState(
    "navigationMode",
    "selectedTeamId",
    "selectedProjectId",
    "currentUser",
    "teams",
    "projects"
  )

  const scopeContext = useMemo<PlanningScope>(() => {
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

  return <ScopedPlanView key={scopeContext.scopeKey ?? navigationMode} scopeContext={scopeContext} />
}

function ScopedPlanView({ scopeContext }: { scopeContext: PlanningScope }) {
  const {
    boards, selectedBoard, selectedSummary, selectedBoardId, isLoading, detailErrorId,
    loadBoard, updateBoardDetail, handleBoardSelection, addBoard, updateBoard, removeBoard,
  } = usePlanningBoards(scopeContext)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [boardDialogState, setBoardDialogState] = useState<BoardDialogState>({ open: false })
  const [bucketDialogState, setBucketDialogState] = useState<BucketDialogState>({ open: false })
  const [cardDialogState, setCardDialogState] = useState<CardDialogState>({ open: false })
  const [deleteConfirmState, setDeleteConfirmState] = useState<DeleteConfirmState>(null)

  const refreshSelectedBoard = async () => {
    try {
      if (selectedBoardId) await loadBoard(selectedBoardId)
    } finally {
      setIsRefreshing(false)
    }
  }

  const items = usePlanningItems({ selectedBoardId, updateBoardDetail, refreshSelectedBoard, setIsRefreshing })
  const buckets = usePlanningBuckets({ updateBoardDetail, refreshSelectedBoard, setIsRefreshing })
  const cardOrder = usePlanningCardOrder({ updateBoardDetail, refreshSelectedBoard, setIsRefreshing })
  const canvas = usePlanningCanvas()

  const handleBoardSubmit = async (values: {
    name: string
    description: string
    color: string
  }) => {
    if (!scopeContext.ready) return

    try {
      setIsRefreshing(true)

      if (boardDialogState.board) {
        const updated = await planningAPI.updateBoard(boardDialogState.board.id, values)
        updateBoard(updated)
        showToast.success("保存成功", "计划板已更新")
      } else {
        const createdBoard = await planningAPI.createBoard({
          scopeType: scopeContext.scopeType,
          scopeId: scopeContext.scopeId,
          ...values,
        })
        addBoard(createdBoard)
        showToast.success("创建成功", "新的计划板已创建")
      }

      setBoardDialogState({ open: false, board: null })
      setIsRefreshing(false)
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
        const deletedId = deleteConfirmState.id
        await planningAPI.deleteBoard(deletedId)
        removeBoard(deletedId)
        setDeleteConfirmState(null)
        setIsRefreshing(false)
        showToast.success("删除成功", "计划板已删除")
        return
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
      await refreshSelectedBoard()
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
      await refreshSelectedBoard()
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
      await refreshSelectedBoard()
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
                  {selectedSummary && <span>{` —— ${selectedSummary.name}`}</span>}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedSummary?.description || scopeContext.scopeCaption}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {boards.length > 0 && (
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
          {detailErrorId === selectedBoardId ? (
            <Button variant="outline" onClick={() => void loadBoard(selectedBoardId)}>重试加载</Button>
          ) : (
            <span>正在加载计划板...</span>
          )}
        </div>
      ) : (
        <PlanningBoardCanvas
          board={selectedBoard}
          isRefreshing={isRefreshing}
          canvas={canvas}
          buckets={buckets}
          items={items}
          cardOrder={cardOrder}
          onDeleteBucket={handleBucketDelete}
          onNewCard={(bucketId) => setCardDialogState({ open: true, bucketId, card: null })}
          onEditCard={(card) => setCardDialogState({ open: true, card })}
          onDeleteCard={handleCardDelete}
        />
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
