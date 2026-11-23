"use client"

import { useCallback,useEffect,useRef,useState } from "react"
import { planningAPI,type PlanningBoard,type PlanningBoardSummary } from "@/lib/api/planning"
import { showToast } from "@/lib/toast"
import type { PlanningScope } from "./planning-scope"

const BOARD_SELECTION_STORAGE_KEY = "planning-board-selection-v1"

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

export type UpdatePlanningBoard = (boardId: string, update: (board: PlanningBoard) => PlanningBoard) => void

export function usePlanningBoards(scopeContext: PlanningScope) {
  const [boards, setBoards] = useState<PlanningBoardSummary[]>([])
  const [boardDetails, setBoardDetails] = useState<Record<string, PlanningBoard>>({})
  const [selectedBoardId, setSelectedBoardId] = useState("")
  const [isLoading, setIsLoading] = useState(scopeContext.ready)
  const [detailErrorId, setDetailErrorId] = useState<string | null>(null)
  const detailRequests = useRef(new Map<string, AbortController>())

  const selectedSummary = boards.find((board) => board.id === selectedBoardId)
  const selectedDetail = boardDetails[selectedBoardId]
  const selectedBoard = selectedSummary && selectedDetail
    ? { ...selectedSummary, buckets: selectedDetail.buckets }
    : null
  const { scopeType, scopeId, scopeKey } = scopeContext

  useEffect(() => {
    if (!scopeType || !scopeId || !scopeKey) return
    const request = new AbortController()

    void planningAPI.getBoardSummaries(scopeType, scopeId, request.signal)
      .then((nextBoards) => {
        if (request.signal.aborted) return
        setBoards(nextBoards)
        const storedId = readBoardSelections()[scopeKey]
        setSelectedBoardId(nextBoards.find((board) => board.id === storedId)?.id ?? nextBoards[0]?.id ?? "")
      })
      .catch((error: unknown) => {
        if (request.signal.aborted) return
        showToast.error("加载计划板列表失败", error instanceof Error ? error.message : "请稍后重试")
      })
      .finally(() => {
        if (!request.signal.aborted) setIsLoading(false)
      })

    return () => request.abort()
  }, [scopeType, scopeId, scopeKey])

  const loadBoard = useCallback(async (boardId: string) => {
    const requests = detailRequests.current
    requests.get(boardId)?.abort()
    const request = new AbortController()
    requests.set(boardId, request)
    setDetailErrorId((current) => current === boardId ? null : current)

    try {
      const detail = await planningAPI.getBoard(boardId, request.signal)
      if (!request.signal.aborted) {
        setBoardDetails((current) => ({ ...current, [boardId]: detail }))
      }
    } catch (error) {
      if (request.signal.aborted) return
      setDetailErrorId(boardId)
      showToast.error("加载计划板失败", error instanceof Error ? error.message : "请稍后重试")
    } finally {
      if (requests.get(boardId) === request) requests.delete(boardId)
    }
  }, [])

  useEffect(() => {
    const requests = detailRequests.current
    return () => {
      requests.forEach((request) => request.abort())
      requests.clear()
    }
  }, [])

  useEffect(() => {
    if (selectedBoardId) void loadBoard(selectedBoardId)
  }, [loadBoard, selectedBoardId])

  const updateBoardDetail = (boardId: string, update: (board: PlanningBoard) => PlanningBoard) => {
    detailRequests.current.get(boardId)?.abort()
    setBoardDetails((current) => current[boardId]
      ? { ...current, [boardId]: update(current[boardId]) }
      : current
    )
  }

  const handleBoardSelection = (boardId: string) => {
    setSelectedBoardId(boardId)
    if (scopeContext.ready) {
      writeBoardSelection(scopeContext.scopeKey, boardId)
    }
  }

  const addBoard = (board: PlanningBoard) => {
    const { buckets, ...summary } = board
    setBoards((current) => [...current, summary])
    setBoardDetails((current) => ({ ...current, [board.id]: { ...summary, buckets } }))
    handleBoardSelection(board.id)
  }

  const updateBoard = (summary: PlanningBoardSummary) => {
    setBoards((current) => current.map((board) => board.id === summary.id ? summary : board))
  }

  const removeBoard = (boardId: string) => {
    detailRequests.current.get(boardId)?.abort()
    setBoards((current) => current.filter((board) => board.id !== boardId))
    setBoardDetails((current) => {
      const next = { ...current }
      delete next[boardId]
      return next
    })
    if (selectedBoardId === boardId) {
      handleBoardSelection(boards.find((board) => board.id !== boardId)?.id ?? "")
    }
  }

  return {
    boards, selectedBoard, selectedSummary, selectedBoardId, isLoading, detailErrorId,
    loadBoard, updateBoardDetail, handleBoardSelection, addBoard, updateBoard, removeBoard,
  }
}
