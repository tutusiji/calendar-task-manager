"use client"

import { useEffect,useRef,useState,type MouseEvent as ReactMouseEvent } from "react"

const PROGRESS_DISPLAY_STORAGE_KEY = "planning-progress-display-v1"

type ProgressDisplayMode = "fraction" | "percentage"

function readProgressDisplayMode() {
  if (typeof window === "undefined") return "fraction" as ProgressDisplayMode

  const storedValue = localStorage.getItem(PROGRESS_DISPLAY_STORAGE_KEY)
  return storedValue === "percentage" ? "percentage" : "fraction"
}

function writeProgressDisplayMode(mode: ProgressDisplayMode) {
  if (typeof window === "undefined") return
  localStorage.setItem(PROGRESS_DISPLAY_STORAGE_KEY, mode)
}

export function usePlanningCanvas() {
  const [progressDisplayMode, setProgressDisplayMode] = useState<ProgressDisplayMode>(() =>
    readProgressDisplayMode()
  )
  const [isBoardCanvasDragging, setIsBoardCanvasDragging] = useState(false)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef({
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })

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

  return {
    progressDisplayMode,
    isBoardCanvasDragging,
    scrollViewportRef,
    handleToggleProgressDisplayMode,
    handleBoardCanvasMouseDown,
  }
}
