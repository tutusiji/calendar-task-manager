import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import type { PlanningCard } from "@/lib/api/planning"
import { DEFAULT_PLANNING_CARD_COLOR,PLANNING_COLOR_PRESETS } from "@/lib/planning"

export function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

export function getCompletionStats(card: PlanningCard) {
  const totalCount = card.items.length
  const completedCount = card.items.filter((item) => item.isCompleted).length
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  return {
    totalCount,
    completedCount,
    percentage,
  }
}

export function getContrastTextColor(hexColor: string) {
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

export function getRandomPlanningCardColor() {
  const randomIndex = Math.floor(Math.random() * PLANNING_COLOR_PRESETS.length)
  return PLANNING_COLOR_PRESETS[randomIndex] || DEFAULT_PLANNING_CARD_COLOR
}

export function shouldSubmitOnEnter(event: ReactKeyboardEvent<HTMLElement>) {
  return event.key === "Enter" && !event.shiftKey && !(event.target instanceof HTMLTextAreaElement)
}
