export const PLANNING_SCOPE_TYPES = ["PERSONAL", "TEAM", "PROJECT"] as const

export type PlanningScopeType = (typeof PLANNING_SCOPE_TYPES)[number]

export const DEFAULT_PLANNING_BOARD_COLOR = "#38bdf8"
export const DEFAULT_PLANNING_CARD_COLOR = "#7dd3fc"
export const DEFAULT_PLANNING_BUCKET_TITLE = "未分类"
export const DEFAULT_PLANNING_BUCKET_WIDTH = 296
export const MIN_PLANNING_BUCKET_WIDTH = 260
export const MAX_PLANNING_BUCKET_WIDTH = 520

export const PLANNING_COLOR_PRESETS = [
  "#38bdf8",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#f472b6",
  "#fb7185",
  "#f59e0b",
  "#34d399",
  "#22c55e",
  "#94a3b8",
] as const

export function isPlanningScopeType(value: string): value is PlanningScopeType {
  return PLANNING_SCOPE_TYPES.includes(value as PlanningScopeType)
}
