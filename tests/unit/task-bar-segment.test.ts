import { describe, expect, it } from "vitest"
import { getTaskBarProgress, getTaskBarSegment } from "@/lib/utils/task-bar-segment"

describe("task bar segments", () => {
  const monday = new Date(2026, 4, 18)
  const friday = new Date(2026, 4, 22)
  const nextMonday = new Date(2026, 4, 25)
  const nextTuesday = new Date(2026, 4, 26)

  it("uses separate start and end segments across weekends", () => {
    const task = { startDate: friday, endDate: nextTuesday }
    expect(getTaskBarSegment(task, friday, false)).toMatchObject({ spanDays: 3, totalDays: 5, roundedClass: "rounded-l-full" })
    expect(getTaskBarSegment(task, friday, true)).toMatchObject({ spanDays: 1, totalDays: 3, roundedClass: "rounded-l-full" })
    expect(getTaskBarSegment(task, nextMonday, true)).toMatchObject({ spanDays: 2, daysBeforeSegment: 1, roundedClass: "rounded-r-full" })
  })

  it("shows a progress handle only on the segment that contains it", () => {
    const task = { startDate: monday, endDate: nextTuesday }
    const first = getTaskBarSegment(task, monday, true)
    const last = getTaskBarSegment(task, nextMonday, true)
    expect(getTaskBarProgress(first, 100)).toEqual({ segmentProgress: 100, isHandleInSegment: false })
    expect(getTaskBarProgress(last, 100)).toEqual({ segmentProgress: 100, isHandleInSegment: true })
    expect(getTaskBarProgress(last, 0)).toEqual({ segmentProgress: 0, isHandleInSegment: false })
  })
})
