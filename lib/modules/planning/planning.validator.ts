import {
  DEFAULT_PLANNING_BOARD_COLOR,
  DEFAULT_PLANNING_BUCKET_WIDTH,
  DEFAULT_PLANNING_CARD_COLOR,
  MAX_PLANNING_BUCKET_WIDTH,
  MIN_PLANNING_BUCKET_WIDTH,
} from "@/lib/planning"
import { isValidHexColor, sanitizeString } from "@/lib/validation"

export function normalizePlanningColor(
  color: string | undefined | null,
  fallback: string = DEFAULT_PLANNING_BOARD_COLOR
) {
  const normalized = sanitizeString(color || "", 20)
  return isValidHexColor(normalized) ? normalized : fallback
}

export function normalizePlanningCardColor(color: string | undefined | null) {
  return normalizePlanningColor(color, DEFAULT_PLANNING_CARD_COLOR)
}

export function normalizePlanningBucketWidth(
  width: unknown,
  fallback: number = DEFAULT_PLANNING_BUCKET_WIDTH
) {
  const numericWidth =
    typeof width === "number"
      ? width
      : typeof width === "string"
        ? Number(width)
        : fallback

  if (!Number.isFinite(numericWidth)) {
    return fallback
  }

  return Math.min(
    MAX_PLANNING_BUCKET_WIDTH,
    Math.max(MIN_PLANNING_BUCKET_WIDTH, Math.round(numericWidth))
  )
}

export function sanitizePlanningText(value: string | undefined | null, maxLength = 120) {
  return sanitizeString(value || "", maxLength)
}

export function sanitizePlanningIdList(values: unknown, maxLength = 80) {
  if (!Array.isArray(values)) {
    return [] as string[]
  }

  return Array.from(
    new Set(
      values
        .map((value) =>
          typeof value === "string" ? sanitizePlanningText(value, maxLength) : ""
        )
        .filter((value): value is string => Boolean(value))
    )
  )
}
