export type CalendarBarLayout = "content-box" | "padded-day"

interface CalendarBarMetrics {
  left: string
  width: string
}

export function getCalendarBarMetrics(
  spanDays: number,
  layout: CalendarBarLayout
): CalendarBarMetrics {
  const safeSpanDays = Math.max(1, spanDays)

  if (layout === "padded-day") {
    return {
      left: "8px",
      width:
        safeSpanDays === 1
          ? "calc(100% - 16px)"
          : `calc(100% * ${safeSpanDays} + ${safeSpanDays - 17}px)`,
    }
  }

  return {
    left: "0",
    width:
      safeSpanDays === 1
        ? "100%"
        : `calc(100% * ${safeSpanDays} + 17px * ${safeSpanDays - 1})`,
  }
}
