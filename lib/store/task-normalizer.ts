import type { Task } from '@/lib/types'

/**
 * 将 API 返回的任务 JSON 转换为前端 Task（日期字段转为 Date）。
 */
export function parseApiTask(raw: any): Task {
  return {
    ...raw,
    startDate: new Date(raw.startDate),
    endDate: new Date(raw.endDate),
    recurrenceDate: raw.recurrenceDate
      ? new Date(raw.recurrenceDate)
      : undefined,
    recurringSeries: raw.recurringSeries
      ? {
          ...raw.recurringSeries,
          startDate: raw.recurringSeries.startDate
            ? new Date(raw.recurringSeries.startDate)
            : undefined,
          stopsAfter: raw.recurringSeries.stopsAfter
            ? new Date(raw.recurringSeries.stopsAfter)
            : undefined,
          generatedUntil: raw.recurringSeries.generatedUntil
            ? new Date(raw.recurringSeries.generatedUntil)
            : undefined,
        }
      : null,
  }
}

export function sortTasksByStartDate(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  )
}
